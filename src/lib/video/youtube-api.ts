import { createServerSupabase } from "../supabase-server";
import { groq } from "../ai/groq";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY ?? "";
const RAPIDAPI_HOST = "youtube-media-downloader.p.rapidapi.com";

// Search YouTube HTML for shorts/video IDs (same as before, no binary needed)
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
    const ids = [
      ...new Set(
        [...html.matchAll(/\/shorts\/([a-zA-Z0-9_-]{11})/g)].map((m) => m[1])
      ),
    ];
    return ids.slice(0, 3);
  }

  const ids = [
    ...new Set(
      [...html.matchAll(/\/watch\?v=([a-zA-Z0-9_-]{11})/g)].map((m) => m[1])
    ),
  ];
  return ids.slice(0, 3);
}

// Get direct download URL via RapidAPI
async function getDownloadUrl(videoId: string): Promise<string | null> {
  if (!RAPIDAPI_KEY) {
    console.warn("No RAPIDAPI_KEY set");
    return null;
  }

  const res = await fetch(
    `https://${RAPIDAPI_HOST}/v2/video/details?videoId=${videoId}`,
    {
      headers: {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": RAPIDAPI_HOST,
      },
      signal: AbortSignal.timeout(15000),
    }
  );

  if (!res.ok) return null;

  const data = await res.json();
  const videos = data?.videos?.items ?? [];

  // Prefer mp4, 360p-720p, smallest file
  const mp4s = videos
    .filter(
      (v: { extension: string; quality: string; url?: string }) =>
        v.extension === "mp4" && v.url
    )
    .sort((a: { sizeText?: string }, b: { sizeText?: string }) => {
      const sizeA = parseFloat(a.sizeText ?? "9999");
      const sizeB = parseFloat(b.sizeText ?? "9999");
      return sizeA - sizeB;
    });

  return mp4s[0]?.url ?? null;
}

// Download video buffer from URL
async function downloadVideoBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(60000),
      headers: {
        Referer: "https://www.youtube.com/",
        Origin: "https://www.youtube.com",
      },
    });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 10000) return null;
    console.log(`Downloaded video: ${(buffer.length / 1024 / 1024).toFixed(1)}MB`);
    return buffer;
  } catch (e) {
    console.warn("Video download failed:", e instanceof Error ? e.message : e);
    return null;
  }
}

// Upload video buffer to Supabase Storage
async function uploadToStorage(buffer: Buffer): Promise<string | null> {
  const fileName = `video_${Date.now()}.mp4`;
  const supabase = createServerSupabase();

  const { error } = await supabase.storage
    .from("videos")
    .upload(fileName, buffer, {
      contentType: "video/mp4",
      upsert: false,
    });

  if (error) {
    console.error("Supabase upload error:", error.message);
    return null;
  }

  const { data: publicUrl } = supabase.storage
    .from("videos")
    .getPublicUrl(fileName);

  return publicUrl.publicUrl;
}

// Use Groq Vision to check thumbnail for human face
async function hasFaceInThumbnail(videoId: string): Promise<boolean> {
  try {
    const thumbUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    const response = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Is there a human face clearly visible in this image? Answer only YES or NO.",
            },
            { type: "image_url", image_url: { url: thumbUrl } },
          ],
        },
      ],
      temperature: 0,
      max_tokens: 10,
    });

    const answer =
      response.choices[0]?.message?.content?.trim().toUpperCase() ?? "";
    console.log(`Face check (${videoId}): ${answer}`);
    return answer.includes("YES");
  } catch {
    return false;
  }
}

// Main: search YouTube → get download URL → download → upload to Supabase
export async function searchAndDownloadYouTubeAPI(
  productName: string
): Promise<string | null> {
  const searchStrategies: { query: string; type: "shorts" | "watch" }[] = [
    { query: `${productName} แกะกล่อง hands on ภาษาไทย #shorts`, type: "shorts" },
    { query: `${productName} รีวิว ภาษาไทย #shorts`, type: "shorts" },
    { query: `${productName} unboxing ไทย #shorts`, type: "shorts" },
    { query: `${productName} รีวิว #shorts`, type: "shorts" },
    { query: `${productName} รีวิว shopee ไทย`, type: "watch" },
  ];

  let fallbackId: string | null = null;

  for (const strategy of searchStrategies) {
    console.log(`Searching: "${strategy.query}" (${strategy.type})`);

    let videoIds: string[];
    try {
      videoIds = await searchYouTube(strategy.query, strategy.type);
    } catch (e) {
      console.warn(`Search failed:`, e instanceof Error ? e.message : e);
      continue;
    }

    if (videoIds.length === 0) continue;
    console.log(`Found ${videoIds.length} IDs: ${videoIds.join(", ")}`);

    for (const videoId of videoIds) {
      try {
        // Check face via thumbnail (free, no download needed)
        const hasFace = await hasFaceInThumbnail(videoId);
        if (hasFace) {
          console.log(`${videoId}: face detected, skipping`);
          if (!fallbackId) fallbackId = videoId;
          continue;
        }

        // No face — get download URL via RapidAPI
        const downloadUrl = await getDownloadUrl(videoId);
        if (!downloadUrl) continue;

        const buffer = await downloadVideoBuffer(downloadUrl);
        if (!buffer) continue;

        const storageUrl = await uploadToStorage(buffer);
        if (storageUrl) return storageUrl;
      } catch (e) {
        console.warn(`Failed ${videoId}:`, e instanceof Error ? e.message : e);
      }
    }
  }

  // Use fallback (video with face) if nothing else worked
  if (fallbackId) {
    console.log("Using fallback video (has face):", fallbackId);
    const downloadUrl = await getDownloadUrl(fallbackId);
    if (downloadUrl) {
      const buffer = await downloadVideoBuffer(downloadUrl);
      if (buffer) {
        return await uploadToStorage(buffer);
      }
    }
  }

  return null;
}
