import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export async function GET() {
  const key = process.env.RAPIDAPI_KEY;
  const results: string[] = [];

  results.push(`RAPIDAPI_KEY: ${key ? key.slice(0, 10) + "..." : "NOT SET"}`);

  try {
    // Step 1: YouTube search
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent("Powerbank รีวิว #shorts")}`;
    const res = await fetch(searchUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(10000),
    });
    const html = await res.text();
    const ids = [...new Set([...html.matchAll(/\/shorts\/([a-zA-Z0-9_-]{11})/g)].map((m) => m[1]))].slice(0, 3);
    results.push(`YouTube search: found ${ids.length} shorts → ${ids.join(", ")}`);

    if (ids.length === 0 || !key) {
      return NextResponse.json({ results });
    }

    // Step 2: RapidAPI get download URL
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
    const mp4s = videos
      .filter((v: { extension: string; url?: string }) => v.extension === "mp4" && v.url)
      .sort((a: { sizeText?: string }, b: { sizeText?: string }) => {
        return parseFloat(a.sizeText ?? "9999") - parseFloat(b.sizeText ?? "9999");
      });

    results.push(`RapidAPI: ${mp4s.length} mp4 files`);

    if (mp4s.length === 0) {
      return NextResponse.json({ results });
    }

    // Step 3: Download video
    const downloadUrl = mp4s[0].url;
    results.push(`Downloading: ${mp4s[0].quality} ${mp4s[0].sizeText}`);

    const videoRes = await fetch(downloadUrl, {
      signal: AbortSignal.timeout(60000),
      headers: {
        Referer: "https://www.youtube.com/",
        Origin: "https://www.youtube.com",
      },
    });
    if (!videoRes.ok) {
      results.push(`Download FAILED: ${videoRes.status}`);
      return NextResponse.json({ results });
    }

    const buffer = Buffer.from(await videoRes.arrayBuffer());
    results.push(`Downloaded: ${(buffer.length / 1024 / 1024).toFixed(1)}MB`);

    // Step 4: Upload to Supabase
    const fileName = `debug_video_${Date.now()}.mp4`;
    const supabase = createServerSupabase();
    const { error } = await supabase.storage
      .from("videos")
      .upload(fileName, buffer, { contentType: "video/mp4", upsert: false });

    if (error) {
      results.push(`Upload FAILED: ${error.message}`);
    } else {
      const { data: publicUrl } = supabase.storage.from("videos").getPublicUrl(fileName);
      results.push(`Upload OK: ${publicUrl.publicUrl}`);
    }
  } catch (e) {
    results.push(`Error: ${e instanceof Error ? e.message : e}`);
  }

  return NextResponse.json({ results });
}
