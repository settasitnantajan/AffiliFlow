import { createServerSupabase } from "../supabase-server";

// Download stock video from Pexels and upload directly to Supabase Storage
// Uses product keyword to find relevant video
export async function getAndUploadStockVideo(
  keyword: string
): Promise<string | null> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    console.warn("No PEXELS_API_KEY set");
    return null;
  }

  try {
    // Try searching with actual product keyword first, then fallback
    const searchTerms = [
      keyword,
      `${keyword} review`,
      `${keyword} product`,
      "product unboxing",
      "online shopping",
    ];

    for (const term of searchTerms) {
      const res = await fetch(
        `https://api.pexels.com/videos/search?query=${encodeURIComponent(term)}&per_page=5&size=small`,
        { headers: { Authorization: apiKey } }
      );

      if (!res.ok) continue;

      const data = await res.json();
      const videos = data?.videos ?? [];
      if (videos.length === 0) continue;

      const video = videos[Math.floor(Math.random() * videos.length)];
      const file = video.video_files?.find(
        (f: { quality: string; width: number }) =>
          (f.quality === "sd" || f.quality === "hd") && f.width <= 1280
      );

      if (!file?.link) continue;

      // Download video as buffer (no filesystem)
      const videoRes = await fetch(file.link);
      if (!videoRes.ok) continue;

      const buffer = Buffer.from(await videoRes.arrayBuffer());
      const fileName = `video_${Date.now()}.mp4`;

      // Upload directly to Supabase Storage
      const supabase = createServerSupabase();
      const { error: uploadError } = await supabase.storage
        .from("videos")
        .upload(fileName, buffer, {
          contentType: "video/mp4",
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError.message);
        continue;
      }

      const { data: publicUrl } = supabase.storage
        .from("videos")
        .getPublicUrl(fileName);

      return publicUrl.publicUrl;
    }

    return null;
  } catch (e) {
    console.error("Stock upload error:", e);
    return null;
  }
}
