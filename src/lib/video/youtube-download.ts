import { execFile } from "child_process";
import { readFile, unlink, stat } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { createServerSupabase } from "../supabase-server";
import { groq } from "../ai/groq";
import { cleanProductName } from "../utils";

// Pick n random items from array (Fisher-Yates shuffle, take first n)
function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

// Run a command and return stdout
function run(
  cmd: string,
  args: string[],
  timeout = 90000
): Promise<string> {
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

// Extract thumbnail frames from a video (start, middle, end)
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
    Math.max(1, Math.floor(duration * 0.15)),  // early
    Math.floor(duration * 0.5),                  // middle
    Math.floor(duration * 0.85),                 // late
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

// Use Groq Vision to check if a video has human faces (checks 3 frames)
async function hasFace(videoPath: string): Promise<{ detected: boolean; thumbPaths: string[] }> {
  const thumbPaths = await extractThumbnails(videoPath);
  try {
    // Check all frames in parallel
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
              {
                type: "text",
                text: "Is there a human face clearly visible in this image? Answer only YES or NO.",
              },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          }],
          temperature: 0,
          max_tokens: 10,
        });

        const answer = response.choices[0]?.message?.content?.trim().toUpperCase() ?? "";
        console.log(`Face detection (${thumbPath}): ${answer}`);
        return answer.includes("YES");
      })
    );

    return { detected: results.some(Boolean), thumbPaths };
  } catch (e) {
    console.warn("Face detection failed:", e instanceof Error ? e.message : e);
    return { detected: false, thumbPaths };
  }
}

// Check if video is portrait using ffprobe
async function isPortrait(filePath: string): Promise<boolean> {
  try {
    const out = await run("ffprobe", [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=width,height",
      "-of", "csv=p=0",
      filePath,
    ], 10000);
    const [w, h] = out.trim().split(",").map(Number);
    console.log(`Video dimensions: ${w}x${h}`);
    return h > w;
  } catch {
    // If ffprobe fails, assume landscape
    return false;
  }
}

// Post-process video to 1080x1920 portrait, max 30s
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

// Search YouTube HTML and extract video IDs
async function searchYouTube(
  query: string,
  type: "shorts" | "watch"
): Promise<string[]> {
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  const res = await fetch(searchUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
    signal: AbortSignal.timeout(10000),
  });
  const html = await res.text();

  if (type === "shorts") {
    // Extract /shorts/{id} links
    const ids = [
      ...new Set(
        [...html.matchAll(/\/shorts\/([a-zA-Z0-9_-]{11})/g)].map((m) => m[1])
      ),
    ];
    return pickRandom(ids, 3);
  }

  // Extract /watch?v={id} links
  const ids = [
    ...new Set(
      [...html.matchAll(/\/watch\?v=([a-zA-Z0-9_-]{11})/g)].map((m) => m[1])
    ),
  ];
  return pickRandom(ids, 3);
}

// Download a single video with yt-dlp
async function downloadVideo(
  videoId: string,
  isShorts: boolean
): Promise<string | null> {
  const url = isShorts
    ? `https://www.youtube.com/shorts/${videoId}`
    : `https://www.youtube.com/watch?v=${videoId}`;
  const outputPath = join(tmpdir(), `yt_${videoId}_${Date.now()}.mp4`);

  console.log(`Trying yt-dlp (${isShorts ? "shorts" : "watch"}): ${videoId}`);

  const args = [
    "-f", "best[height<=1080][ext=mp4]/best[ext=mp4]/best",
    "--no-playlist",
    "--max-filesize", "20M",
    "-o", outputPath,
    url,
  ];

  // Only use download-sections for regular videos (shorts are already short)
  if (!isShorts) {
    args.splice(3, 0, "--download-sections", "*0:00-0:30", "--force-keyframes-at-cuts");
  }

  await run("yt-dlp", args, 90000);

  // Verify file exists and is not too small
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

// Upload a processed video to Supabase and return public URL
async function uploadProcessedVideo(processedPath: string): Promise<string | null> {
  const buffer = await readFile(processedPath);
  console.log(`Processed portrait video: ${(buffer.length / 1024 / 1024).toFixed(1)}MB`);

  const fileName = `video_${Date.now()}.mp4`;
  const supabase = createServerSupabase();

  const { error: uploadError } = await supabase.storage
    .from("videos")
    .upload(fileName, buffer, {
      contentType: "video/mp4",
      upsert: false,
    });

  if (uploadError) {
    console.error("Supabase upload error:", uploadError.message);
    return null;
  }

  const { data: publicUrl } = supabase.storage
    .from("videos")
    .getPublicUrl(fileName);

  return publicUrl.publicUrl;
}

// Search YouTube and download multiple review videos, process to portrait, upload to Supabase
export async function searchAndDownloadMultipleYouTube(
  productName: string,
  count = 3
): Promise<string[]> {
  const urls: string[] = [];
  const usedVideoIds = new Set<string>();

  const cleanName = cleanProductName(productName);

  const searchStrategies: { query: string; type: "shorts" | "watch" }[] = [
    { query: `${cleanName} แกะกล่อง hands on ภาษาไทย #shorts`, type: "shorts" },
    { query: `${cleanName} รีวิว ภาษาไทย #shorts`, type: "shorts" },
    { query: `${cleanName} unboxing ไทย #shorts`, type: "shorts" },
    { query: `${cleanName} รีวิว #shorts`, type: "shorts" },
    { query: `${cleanName} รีวิว shopee ไทย`, type: "watch" },
  ];

  for (const strategy of searchStrategies) {
    if (urls.length >= count) break;

    let videoIds: string[];
    try {
      videoIds = await searchYouTube(strategy.query, strategy.type);
    } catch {
      continue;
    }

    // Filter out already used IDs
    videoIds = videoIds.filter((id) => !usedVideoIds.has(id));
    if (videoIds.length === 0) continue;

    console.log(`[multi] Found ${videoIds.length} new IDs for "${strategy.query}"`);

    for (const videoId of videoIds) {
      if (urls.length >= count) break;
      usedVideoIds.add(videoId);
      const tempFiles: string[] = [];

      try {
        const rawPath = await downloadVideo(videoId, strategy.type === "shorts");
        if (!rawPath) continue;
        tempFiles.push(rawPath);

        const processedPath = await processToPortrait(rawPath);
        tempFiles.push(processedPath);

        const faceResult = await hasFace(processedPath);
        tempFiles.push(...faceResult.thumbPaths);

        // Upload regardless of face (we need 3 videos)
        if (faceResult.detected) {
          console.log(`[multi] Video ${videoId}: face detected but still using`);
        }

        const url = await uploadProcessedVideo(processedPath);
        if (url) {
          urls.push(url);
          console.log(`[multi] Got ${urls.length}/${count} videos`);
        }
      } catch (e) {
        console.warn(`[multi] Failed ${videoId}:`, e instanceof Error ? e.message : e);
      } finally {
        for (const f of tempFiles) await unlink(f).catch(() => {});
      }
    }
  }

  return urls;
}

// Search YouTube and download review video, process to portrait, upload to Supabase
export async function searchAndDownloadYouTube(
  productName: string
): Promise<string | null> {
  try {
    // Search strategies in priority order:
    // 1. Shorts search queries (vertical video, product-first content)
    // 2. Fallback to regular watch videos
    const cleanName = cleanProductName(productName);

    const searchStrategies: { query: string; type: "shorts" | "watch" }[] = [
      { query: `${cleanName} แกะกล่อง hands on ภาษาไทย #shorts`, type: "shorts" },
      { query: `${cleanName} รีวิว ภาษาไทย #shorts`, type: "shorts" },
      { query: `${cleanName} unboxing ไทย #shorts`, type: "shorts" },
      { query: `${cleanName} รีวิว #shorts`, type: "shorts" },
      { query: `${cleanName} รีวิว shopee ไทย`, type: "watch" },
    ];

    for (const strategy of searchStrategies) {
      console.log(`Searching: "${strategy.query}" (${strategy.type})`);

      let videoIds: string[];
      try {
        videoIds = await searchYouTube(strategy.query, strategy.type);
      } catch (e) {
        console.warn(`Search failed for "${strategy.query}":`, e instanceof Error ? e.message : e);
        continue;
      }

      if (videoIds.length === 0) {
        console.warn(`No ${strategy.type} results for: ${strategy.query}`);
        continue;
      }

      console.log(`Found ${videoIds.length} ${strategy.type} IDs: ${videoIds.join(", ")}`);

      // Try downloading each video — prefer no-face videos
      let fallbackPath: string | null = null; // first successful video as fallback
      const tempFiles: string[] = [];

      for (const videoId of videoIds) {
        let rawPath: string | null = null;
        let processedPath: string | null = null;
        try {
          rawPath = await downloadVideo(videoId, strategy.type === "shorts");
          if (!rawPath) continue;
          tempFiles.push(rawPath);

          // Post-process to 1080x1920 portrait
          processedPath = await processToPortrait(rawPath);
          tempFiles.push(processedPath);

          // Check for face using 3 frames (start, middle, end)
          const faceResult = await hasFace(processedPath);
          tempFiles.push(...faceResult.thumbPaths);

          if (faceResult.detected) {
            console.log(`Video ${videoId}: face detected, saving as fallback`);
            if (!fallbackPath) fallbackPath = processedPath;
            continue;
          }

          // No face — use this video!
          console.log(`Video ${videoId}: no face detected, using this one`);
          const url = await uploadProcessedVideo(processedPath);
          if (url) {
            // Cleanup all temp files
            for (const f of tempFiles) await unlink(f).catch(() => {});
            return url;
          }
        } catch (e) {
          console.warn(
            `Failed video ${videoId}:`,
            e instanceof Error ? e.message : e
          );
          continue;
        }
      }

      // All videos had faces — use fallback
      if (fallbackPath) {
        console.log("All videos have faces, using fallback");
        const url = await uploadProcessedVideo(fallbackPath);
        for (const f of tempFiles) await unlink(f).catch(() => {});
        if (url) return url;
      }

      // Cleanup if nothing worked
      for (const f of tempFiles) await unlink(f).catch(() => {});
    }

    return null;
  } catch (e) {
    console.error("YouTube download error:", e);
    return null;
  }
}
