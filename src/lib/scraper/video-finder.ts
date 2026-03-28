import * as cheerio from "cheerio";

export interface VideoSource {
  source_url: string;
  source_type: "youtube" | "tiktok" | "pexels";
}

// Find review videos for a product keyword
export async function findVideoSource(
  keyword: string
): Promise<VideoSource | null> {
  // 1. Try YouTube search
  try {
    const ytResult = await searchYouTube(keyword);
    if (ytResult) return ytResult;
  } catch (e) {
    console.error("YouTube search error:", e);
  }

  // 2. Try Pexels stock video
  try {
    const pexelsResult = await searchPexels(keyword);
    if (pexelsResult) return pexelsResult;
  } catch (e) {
    console.error("Pexels search error:", e);
  }

  return null;
}

async function searchYouTube(keyword: string): Promise<VideoSource | null> {
  const query = encodeURIComponent(`${keyword} รีวิว`);
  const res = await fetch(
    `https://www.youtube.com/results?search_query=${query}&sp=EgQQARgB`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    }
  );

  const html = await res.text();
  // Extract video IDs from YouTube search page
  const videoIdMatch = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
  if (videoIdMatch) {
    return {
      source_url: `https://www.youtube.com/watch?v=${videoIdMatch[1]}`,
      source_type: "youtube",
    };
  }

  return null;
}

async function searchPexels(keyword: string): Promise<VideoSource | null> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return null;

  // Use generic product-related keywords for stock footage
  const stockKeywords = [
    "shopping online",
    "product unboxing",
    "ecommerce",
    "delivery package",
    "mobile shopping",
  ];
  const searchTerm =
    stockKeywords[Math.floor(Math.random() * stockKeywords.length)];

  const res = await fetch(
    `https://api.pexels.com/videos/search?query=${encodeURIComponent(searchTerm)}&per_page=5&size=small`,
    {
      headers: { Authorization: apiKey },
    }
  );

  if (!res.ok) return null;

  const data = await res.json();
  const videos = data?.videos ?? [];

  if (videos.length > 0) {
    const video = videos[Math.floor(Math.random() * videos.length)];
    const file = video.video_files?.find(
      (f: { quality: string }) => f.quality === "sd" || f.quality === "hd"
    );
    if (file?.link) {
      return {
        source_url: file.link,
        source_type: "pexels",
      };
    }
  }

  return null;
}
