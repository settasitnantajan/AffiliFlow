import { execFile } from "child_process";
import { readFile, unlink, stat } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { createServerSupabase } from "../supabase-server";
import { groq } from "../ai/groq";
import { cleanProductName } from "../utils";

// ============================================================
// Helpers
// ============================================================

function run(cmd: string, args: string[], timeout = 90000): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = execFile(cmd, args, { timeout, maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout);
    });
    proc.stderr?.on("data", (d: Buffer) => {
      const line = d.toString().trim();
      if (line) console.log(`[${cmd}] ${line}`);
    });
  });
}

// ============================================================
// Video metadata from yt-dlp search
// ============================================================

interface VideoMeta {
  id: string;
  title: string;
  duration: number;       // seconds
  view_count: number;
  like_count: number;
  upload_date: string;    // YYYYMMDD
  channel: string;
  channel_follower_count: number;
  thumbnail: string;      // URL
  url: string;
  description: string;
}

// Stage 1: Search — yt-dlp flat-playlist search, returns metadata without downloading
async function ytSearch(query: string, limit = 20): Promise<VideoMeta[]> {
  console.log(`[Stage 1] yt-dlp search: "${query}" (limit ${limit})`);
  const out = await run("yt-dlp", [
    "--flat-playlist", "--dump-json", "--no-download",
    `ytsearch${limit}:${query}`,
  ], 30000);

  const results: VideoMeta[] = [];
  for (const line of out.trim().split("\n")) {
    if (!line) continue;
    try {
      const j = JSON.parse(line);
      results.push({
        id: j.id ?? "",
        title: j.title ?? "",
        duration: j.duration ?? 0,
        view_count: j.view_count ?? 0,
        like_count: j.like_count ?? 0,
        upload_date: j.upload_date ?? "",
        channel: j.channel ?? j.uploader ?? "",
        channel_follower_count: j.channel_follower_count ?? 0,
        thumbnail: j.thumbnail ?? j.thumbnails?.[0]?.url ?? "",
        url: j.url ?? j.webpage_url ?? `https://www.youtube.com/watch?v=${j.id}`,
        description: (j.description ?? "").slice(0, 500),
      });
    } catch { /* skip malformed lines */ }
  }
  console.log(`[Stage 1] Got ${results.length} results`);
  return results;
}

// Stage 2: Basic filter — duration, views, freshness
function basicFilter(videos: VideoMeta[]): VideoMeta[] {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 2);
  const cutoff = oneYearAgo.toISOString().replace(/[-T:Z]/g, "").slice(0, 8);

  const filtered = videos.filter((v) => {
    if (v.duration < 15 || v.duration > 900) return false;  // 15s–15min
    if (v.view_count < 50) return false;
    if (v.upload_date && v.upload_date < cutoff) return false;
    return true;
  });
  console.log(`[Stage 2] Basic filter: ${videos.length} → ${filtered.length}`);
  return filtered;
}

// Stage 3: Dedup — similar title + same duration = duplicate
function dedup(videos: VideoMeta[]): VideoMeta[] {
  const kept: VideoMeta[] = [];
  for (const v of videos) {
    const isDup = kept.some((k) => {
      const titleSim = similarity(k.title.toLowerCase(), v.title.toLowerCase());
      const sameDuration = Math.abs(k.duration - v.duration) < 3;
      return titleSim > 0.7 && sameDuration;
    });
    if (!isDup) kept.push(v);
  }
  console.log(`[Stage 3] Dedup: ${videos.length} → ${kept.length}`);
  return kept;
}

// Simple Jaccard similarity on words
function similarity(a: string, b: string): number {
  const setA = new Set(a.split(/\s+/));
  const setB = new Set(b.split(/\s+/));
  let inter = 0;
  for (const w of setA) if (setB.has(w)) inter++;
  const union = setA.size + setB.size - inter;
  return union === 0 ? 0 : inter / union;
}

// Stage 4: AI Ranking — Groq LLM scores relevance from metadata
async function aiRank(videos: VideoMeta[], productName: string, topN = 8): Promise<VideoMeta[]> {
  if (videos.length === 0) return [];
  console.log(`[Stage 4] AI ranking ${videos.length} videos for "${productName}"`);

  const listing = videos.map((v, i) =>
    `${i + 1}. "${v.title}" | ${v.channel} | ${v.duration}s | ${v.view_count} views | ${v.upload_date}`
  ).join("\n");

  try {
    const res = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [{
        role: "user",
        content: `สินค้า: "${productName}"

วีดีโอที่หามา:
${listing}

จัดอันดับวีดีโอที่น่าจะเป็น **รีวิว/แกะกล่อง/hands-on ของสินค้านี้จริงๆ** มากที่สุด
- ให้น้ำหนัก: title ตรงกับสินค้า > เป็นรีวิวจริง > views เยอะ > ใหม่
- ตัดวีดีโอที่เป็น compilation, ข่าว, MV, หรือไม่เกี่ยวข้องออก

ตอบเป็น JSON array ของหมายเลข เรียงจากดีที่สุด เช่น [3,1,5,2]
ตอบแค่ JSON ไม่ต้องอธิบาย`,
      }],
      temperature: 0,
      max_tokens: 200,
    });

    const text = res.choices[0]?.message?.content?.trim() ?? "[]";
    // Extract JSON array from response
    const match = text.match(/\[[\d,\s]+\]/);
    if (match) {
      const indices: number[] = JSON.parse(match[0]);
      const ranked = indices
        .map((i) => videos[i - 1])
        .filter(Boolean)
        .slice(0, topN);
      console.log(`[Stage 4] AI ranked top ${ranked.length}: ${ranked.map(v => v.id).join(", ")}`);
      return ranked;
    }
  } catch (e) {
    console.warn("[Stage 4] AI ranking failed:", e instanceof Error ? e.message : e);
  }

  // Fallback: return by view count
  return [...videos].sort((a, b) => b.view_count - a.view_count).slice(0, topN);
}

// Stage 5: Thumbnail check — Groq Vision checks if thumbnail shows the actual product
async function thumbnailCheck(videos: VideoMeta[], productName: string): Promise<VideoMeta[]> {
  if (videos.length === 0) return [];
  console.log(`[Stage 5] Thumbnail check for ${videos.length} videos`);

  const results = await Promise.all(
    videos.map(async (v) => {
      try {
        const res = await groq.chat.completions.create({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          messages: [{
            role: "user",
            content: [
              {
                type: "text",
                text: `ภาพนี้เป็น thumbnail ของวีดีโอ YouTube ชื่อ "${v.title}"
สินค้าที่ต้องการคือ "${productName}"
thumbnail นี้แสดงสินค้าดังกล่าว หรือเป็นรีวิว/แกะกล่องของสินค้าดังกล่าวหรือไม่?
ตอบแค่ YES หรือ NO`,
              },
              { type: "image_url", image_url: { url: v.thumbnail } },
            ],
          }],
          temperature: 0,
          max_tokens: 10,
        });
        const answer = res.choices[0]?.message?.content?.trim().toUpperCase() ?? "";
        const pass = answer.includes("YES");
        console.log(`  Thumbnail ${v.id}: ${pass ? "PASS" : "SKIP"} (${answer})`);
        return pass ? v : null;
      } catch (e) {
        console.warn(`  Thumbnail ${v.id}: error, keeping`, e instanceof Error ? e.message : e);
        return v; // keep on error
      }
    })
  );

  const passed = results.filter(Boolean) as VideoMeta[];
  console.log(`[Stage 5] Thumbnail: ${videos.length} → ${passed.length}`);
  return passed;
}

// ============================================================
// Video processing (kept from original)
// ============================================================

async function extractThumbnails(videoPath: string): Promise<string[]> {
  let duration = 10;
  try {
    const out = await run("ffprobe", [
      "-v", "error", "-show_entries", "format=duration",
      "-of", "csv=p=0", videoPath,
    ], 10000);
    duration = Math.max(3, Math.floor(parseFloat(out.trim())));
  } catch { /* use default */ }

  const timestamps = [
    Math.max(1, Math.floor(duration * 0.15)),
    Math.floor(duration * 0.5),
    Math.floor(duration * 0.85),
  ];

  const paths = await Promise.all(
    timestamps.map(async (ts, i) => {
      const thumbPath = videoPath.replace(".mp4", `_thumb${i}.jpg`);
      await run("ffmpeg", [
        "-y", "-ss", String(ts), "-i", videoPath,
        "-frames:v", "1", "-q:v", "5", "-update", "1", thumbPath,
      ], 15000);
      return thumbPath;
    })
  );
  return paths;
}

async function hasFace(videoPath: string): Promise<{ detected: boolean; thumbPaths: string[] }> {
  const thumbPaths = await extractThumbnails(videoPath);
  try {
    const results = await Promise.all(
      thumbPaths.map(async (thumbPath) => {
        const imageBuffer = await readFile(thumbPath);
        const base64 = imageBuffer.toString("base64");
        const dataUrl = `data:image/jpeg;base64,${base64}`;

        const response = await groq.chat.completions.create({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          messages: [{
            role: "user",
            content: [
              { type: "text", text: "Is there a human face clearly visible in this image? Answer only YES or NO." },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          }],
          temperature: 0,
          max_tokens: 10,
        });

        const answer = response.choices[0]?.message?.content?.trim().toUpperCase() ?? "";
        console.log(`  Face (${thumbPath}): ${answer}`);
        return answer.includes("YES");
      })
    );
    return { detected: results.some(Boolean), thumbPaths };
  } catch (e) {
    console.warn("Face detection failed:", e instanceof Error ? e.message : e);
    return { detected: false, thumbPaths };
  }
}

async function isPortrait(filePath: string): Promise<boolean> {
  try {
    const out = await run("ffprobe", [
      "-v", "error", "-select_streams", "v:0",
      "-show_entries", "stream=width,height",
      "-of", "csv=p=0", filePath,
    ], 10000);
    const [w, h] = out.trim().split(",").map(Number);
    console.log(`Video dimensions: ${w}x${h}`);
    return h > w;
  } catch {
    return false;
  }
}

async function processToPortrait(inputPath: string): Promise<string> {
  const outputPath = inputPath.replace(".mp4", "_portrait.mp4");
  const portrait = await isPortrait(inputPath);

  const vf = portrait
    ? "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2"
    : "crop=ih*9/16:ih,scale=1080:1920";

  console.log(`FFmpeg: ${portrait ? "portrait scale" : "landscape crop+scale"}`);

  await run("ffmpeg", [
    "-y", "-i", inputPath,
    "-vf", vf,
    "-t", "30",
    "-c:v", "libx264", "-preset", "fast", "-crf", "23",
    "-c:a", "aac", "-b:a", "128k",
    "-movflags", "+faststart",
    outputPath,
  ], 60000);

  return outputPath;
}

async function downloadVideo(videoId: string, isShorts: boolean): Promise<string | null> {
  const url = isShorts
    ? `https://www.youtube.com/shorts/${videoId}`
    : `https://www.youtube.com/watch?v=${videoId}`;
  const outputPath = join(tmpdir(), `yt_${videoId}_${Date.now()}.mp4`);

  console.log(`[Stage 6] Downloading ${videoId} (${isShorts ? "shorts" : "watch"})`);

  const args = [
    "-f", "best[height<=1080][ext=mp4]/best[ext=mp4]/best",
    "--no-playlist",
    "--max-filesize", "20M",
    "-o", outputPath,
    url,
  ];

  if (!isShorts) {
    args.splice(3, 0, "--download-sections", "*0:00-0:30", "--force-keyframes-at-cuts");
  }

  await run("yt-dlp", args, 90000);

  try {
    const st = await stat(outputPath);
    if (st.size < 10000) {
      console.warn(`Video ${videoId}: too small (${st.size} bytes)`);
      await unlink(outputPath).catch(() => {});
      return null;
    }
    console.log(`Downloaded ${videoId}: ${(st.size / 1024 / 1024).toFixed(1)}MB`);
    return outputPath;
  } catch {
    return null;
  }
}

async function uploadProcessedVideo(processedPath: string): Promise<string | null> {
  const buffer = await readFile(processedPath);
  console.log(`Processed portrait video: ${(buffer.length / 1024 / 1024).toFixed(1)}MB`);

  const fileName = `video_${Date.now()}.mp4`;
  const supabase = createServerSupabase();

  const { error: uploadError } = await supabase.storage
    .from("videos")
    .upload(fileName, buffer, { contentType: "video/mp4", upsert: false });

  if (uploadError) {
    console.error("Supabase upload error:", uploadError.message);
    return null;
  }

  const { data: publicUrl } = supabase.storage
    .from("videos")
    .getPublicUrl(fileName);

  return publicUrl.publicUrl;
}

// ============================================================
// Main pipeline: 6-stage video search & download
// ============================================================

export async function searchAndDownloadMultipleYouTube(
  productName: string,
  count = 5
): Promise<string[]> {
  const cleanName = cleanProductName(productName);
  console.log(`\n=== Video Pipeline: "${cleanName}" (need ${count}) ===`);

  // Stage 1: Search with multiple queries, merge results
  const queries = [
    `${cleanName} รีวิว แกะกล่อง`,
    `${cleanName} review unboxing`,
    `${cleanName} รีวิว shopee`,
  ];

  const allResults: VideoMeta[] = [];
  const seenIds = new Set<string>();

  for (const q of queries) {
    try {
      const results = await ytSearch(q, 10);
      for (const r of results) {
        if (!seenIds.has(r.id)) {
          seenIds.add(r.id);
          allResults.push(r);
        }
      }
    } catch (e) {
      console.warn(`[Stage 1] Search failed for "${q}":`, e instanceof Error ? e.message : e);
    }
  }

  if (allResults.length === 0) {
    console.warn("No search results at all");
    return [];
  }

  // Stage 2: Basic filter
  const filtered = basicFilter(allResults);
  if (filtered.length === 0) {
    console.warn("All results filtered out");
    return [];
  }

  // Stage 3: Dedup
  const unique = dedup(filtered);

  // Stage 4: AI Ranking
  const ranked = await aiRank(unique, cleanName, 8);

  // Stage 5: Thumbnail check
  const checked = await thumbnailCheck(ranked, cleanName);

  // Stage 6: Download + portrait + face detection → skip if face detected
  console.log(`[Stage 6] Downloading top candidates (need ${count} without faces)`);
  const urls: string[] = [];

  for (const video of checked) {
    if (urls.length >= count) break;
    const tempFiles: string[] = [];
    const isShorts = video.duration <= 60;

    try {
      const rawPath = await downloadVideo(video.id, isShorts);
      if (!rawPath) continue;
      tempFiles.push(rawPath);

      const processedPath = await processToPortrait(rawPath);
      tempFiles.push(processedPath);

      const faceResult = await hasFace(processedPath);
      tempFiles.push(...faceResult.thumbPaths);

      if (faceResult.detected) {
        console.log(`  ${video.id}: face detected → skip`);
        continue;
      }

      const url = await uploadProcessedVideo(processedPath);
      if (url) {
        urls.push(url);
        console.log(`  Got ${urls.length}/${count} videos`);
      }
    } catch (e) {
      console.warn(`  ${video.id} failed:`, e instanceof Error ? e.message : e);
    } finally {
      for (const f of tempFiles) await unlink(f).catch(() => {});
    }
  }

  // Fallback: if not enough no-face videos, re-download with faces allowed
  if (urls.length < count && checked.length > 0) {
    console.log(`[Stage 6] Fallback: need ${count - urls.length} more, allowing faces`);
    for (const video of checked) {
      if (urls.length >= count) break;
      const tempFiles: string[] = [];
      const isShorts = video.duration <= 60;

      try {
        const rawPath = await downloadVideo(video.id, isShorts);
        if (!rawPath) continue;
        tempFiles.push(rawPath);

        const processedPath = await processToPortrait(rawPath);
        tempFiles.push(processedPath);

        const url = await uploadProcessedVideo(processedPath);
        if (url && !urls.includes(url)) {
          urls.push(url);
          console.log(`  Fallback got ${urls.length}/${count}`);
        }
      } catch {
        // skip
      } finally {
        for (const f of tempFiles) await unlink(f).catch(() => {});
      }
    }
  }

  console.log(`=== Video Pipeline done: ${urls.length} videos ===\n`);
  return urls;
}
