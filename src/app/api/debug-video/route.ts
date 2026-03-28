import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.RAPIDAPI_KEY;
  const results: string[] = [];

  results.push(`RAPIDAPI_KEY: ${key ? key.slice(0, 10) + "..." : "NOT SET"}`);

  // Test 1: YouTube search
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent("Powerbank รีวิว #shorts")}`;
    const res = await fetch(searchUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(10000),
    });
    const html = await res.text();
    const ids = [...new Set([...html.matchAll(/\/shorts\/([a-zA-Z0-9_-]{11})/g)].map((m) => m[1]))].slice(0, 3);
    results.push(`YouTube search: found ${ids.length} shorts → ${ids.join(", ")}`);

    // Test 2: RapidAPI get video details
    if (ids.length > 0 && key) {
      const apiRes = await fetch(
        `https://youtube-media-downloader.p.rapidapi.com/v2/video/details?videoId=${ids[0]}`,
        {
          headers: {
            "X-RapidAPI-Key": key,
            "X-RapidAPI-Host": "youtube-media-downloader.p.rapidapi.com",
          },
          signal: AbortSignal.timeout(15000),
        }
      );
      const data = await apiRes.json();
      const videos = data?.videos?.items ?? [];
      const mp4s = videos.filter((v: { extension: string }) => v.extension === "mp4");
      results.push(`RapidAPI status: ${apiRes.status}`);
      results.push(`Videos found: ${videos.length} total, ${mp4s.length} mp4`);
      if (mp4s[0]?.url) {
        results.push(`Download URL: ${mp4s[0].url.slice(0, 80)}...`);
      }
      if (data?.errorId && data.errorId !== "Success") {
        results.push(`API error: ${JSON.stringify(data)}`);
      }
    }
  } catch (e) {
    results.push(`Error: ${e instanceof Error ? e.message : e}`);
  }

  return NextResponse.json({ results });
}
