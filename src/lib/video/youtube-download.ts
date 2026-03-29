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

// Retry with exponential backoff for Groq 429 errors
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e: unknown) {
      const status = (e as { status?: number })?.status;
      if (status === 429 && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 2000;
        console.warn(`[Rate limit] 429, retry in ${delay}ms (${attempt + 1}/${maxRetries})`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw e;
    }
  }
  throw new Error("withRetry: unreachable");
}

// ============================================================
// YouTube search — HTML scraping (reliable method)
// ============================================================

async function searchYouTube(query: string): Promise<string[]> {
  console.log(`  Search: "${query}"`);
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  const res = await fetch(searchUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    signal: AbortSignal.timeout(10000),
  });
  const html = await res.text();

  // Extract both shorts and watch IDs, keep YouTube relevance order
  const ids = [...new Set([
    ...[...html.matchAll(/\/shorts\/([a-zA-Z0-9_-]{11})/g)].map((m) => m[1]),
    ...[...html.matchAll(/\/watch\?v=([a-zA-Z0-9_-]{11})/g)].map((m) => m[1]),
  ])];

  console.log(`  Found ${ids.length} IDs`);
  return ids;
}

// AI generates short search queries from long product names
async function generateSearchQueries(productName: string): Promise<string[]> {
  const fallback = [
    `${productName} รีวิว`,
    `${productName} review`,
  ];
  try {
    const res = await withRetry(() => groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [{
        role: "user",
        content: `ชื่อสินค้า: "${productName}"

สร้าง YouTube search query สั้นๆ 4 อัน เพื่อหาวีดีโอรีวิว/แกะกล่องของสินค้านี้
- แต่ละ query ไม่เกิน 5-6 คำ
- ดึงเฉพาะชื่อแบรนด์ + ชื่อรุ่น + ประเภทสินค้า (ตัดคำขยายออก)
- ผสมทั้งภาษาไทยและอังกฤษ
- อันสุดท้ายเป็น shorts

ตอบเป็น JSON array เช่น ["Xiaomi Mijia แอร์ รีวิว", "Mijia air conditioner review", "แอร์ Xiaomi แกะกล่อง", "Xiaomi Mijia air #shorts"]
ตอบแค่ JSON ไม่ต้องอธิบาย`,
      }],
      temperature: 0.3,
      max_tokens: 200,
    }));
    const text = res.choices[0]?.message?.content?.trim() ?? "[]";
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      const queries: string[] = JSON.parse(match[0]);
      if (queries.length > 0) {
        console.log(`AI queries: ${queries.join(" | ")}`);
        return queries.slice(0, 4);
      }
    }
  } catch (e) {
    console.warn("AI query failed:", e instanceof Error ? e.message : e);
  }
  return fallback;
}

// ============================================================
// Video processing
// ============================================================

async function extractThumbnails(videoPath: string): Promise<string[]> {
  let duration = 10;
  try {
    const out = await run("ffprobe", [
      "-v", "error", "-show_entries", "format=duration",
      "-of", "csv=p=0", videoPath,
    ], 10000);
    duration = Math.max(3, Math.floor(parseFloat(out.trim())));
  } catch { /* default */ }

  const timestamps = [
    Math.max(1, Math.floor(duration * 0.15)),
    Math.floor(duration * 0.5),
    Math.floor(duration * 0.85),
  ];

  return Promise.all(
    timestamps.map(async (ts, i) => {
      const thumbPath = videoPath.replace(".mp4", `_thumb${i}.jpg`);
      await run("ffmpeg", [
        "-y", "-ss", String(ts), "-i", videoPath,
        "-frames:v", "1", "-q:v", "5", "-update", "1", thumbPath,
      ], 15000);
      return thumbPath;
    })
  );
}

async function hasFace(videoPath: string): Promise<{ detected: boolean; thumbPaths: string[] }> {
  const thumbPaths = await extractThumbnails(videoPath);
  try {
    // Check sequentially with delay to avoid rate limits
    const results: boolean[] = [];
    for (const thumbPath of thumbPaths) {
      const imageBuffer = await readFile(thumbPath);
      const base64 = imageBuffer.toString("base64");
      const dataUrl = `data:image/jpeg;base64,${base64}`;

      const response = await withRetry(() => groq.chat.completions.create({
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
      }));

      const answer = response.choices[0]?.message?.content?.trim().toUpperCase() ?? "";
      console.log(`  Face (${thumbPath}): ${answer}`);
      results.push(answer.includes("YES"));

      // Small delay between calls
      await new Promise((r) => setTimeout(r, 500));
    }
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

  console.log(`  Download ${videoId} (${isShorts ? "shorts" : "watch"})`);

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
    console.log(`  Downloaded ${videoId}: ${(st.size / 1024 / 1024).toFixed(1)}MB`);
    return outputPath;
  } catch {
    return null;
  }
}

async function uploadProcessedVideo(processedPath: string): Promise<string | null> {
  const buffer = await readFile(processedPath);
  console.log(`  Uploaded: ${(buffer.length / 1024 / 1024).toFixed(1)}MB`);

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
// Main: Search → Download → Face check → Upload (simple & reliable)
// ============================================================

export async function searchAndDownloadMultipleYouTube(
  productName: string,
  count = 5
): Promise<string[]> {
  const cleanName = cleanProductName(productName);
  console.log(`\n=== Video Search: "${cleanName}" (need ${count}) ===`);

  // Step 1: AI generates short queries, then search YouTube
  const queries = await generateSearchQueries(cleanName);

  const allIds: string[] = [];
  const seenIds = new Set<string>();

  for (const q of queries) {
    try {
      const ids = await searchYouTube(q);
      for (const id of ids) {
        if (!seenIds.has(id)) {
          seenIds.add(id);
          allIds.push(id);
        }
      }
    } catch (e) {
      console.warn(`Search failed "${q}":`, e instanceof Error ? e.message : e);
    }
  }

  console.log(`Total unique IDs: ${allIds.length}`);
  if (allIds.length === 0) return [];

  // Step 2: Download, process, face check — no-face first, face as backup
  const noFaceUrls: string[] = [];
  const faceUrls: string[] = [];

  for (const videoId of allIds) {
    // Have enough no-face videos
    if (noFaceUrls.length >= count) break;
    // Have enough total to fill count
    if (noFaceUrls.length + faceUrls.length >= count + 3) break;

    const tempFiles: string[] = [];
    const isShorts = false; // try as watch first, yt-dlp handles both

    try {
      const rawPath = await downloadVideo(videoId, isShorts);
      if (!rawPath) continue;
      tempFiles.push(rawPath);

      const processedPath = await processToPortrait(rawPath);
      tempFiles.push(processedPath);

      const faceResult = await hasFace(processedPath);
      tempFiles.push(...faceResult.thumbPaths);

      const url = await uploadProcessedVideo(processedPath);
      if (!url) continue;

      if (faceResult.detected) {
        console.log(`  ${videoId}: face → backup (${faceUrls.length + 1})`);
        faceUrls.push(url);
      } else {
        console.log(`  ${videoId}: no face ✓ (${noFaceUrls.length + 1}/${count})`);
        noFaceUrls.push(url);
      }
    } catch (e) {
      console.warn(`  ${videoId} failed:`, e instanceof Error ? e.message : e);
    } finally {
      for (const f of tempFiles) await unlink(f).catch(() => {});
    }
  }

  // Combine: no-face first, then face to fill up to count
  const urls = [...noFaceUrls, ...faceUrls].slice(0, count);
  console.log(`=== Done: ${urls.length} videos (${noFaceUrls.length} no-face + ${Math.max(0, urls.length - noFaceUrls.length)} face) ===\n`);
  return urls;
}
