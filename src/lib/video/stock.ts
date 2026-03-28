import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Download a stock video from Pexels as fallback
export async function getStockVideo(keyword: string): Promise<string | null> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    console.warn("No PEXELS_API_KEY set, cannot get stock video");
    return null;
  }

  try {
    const stockTerms = [
      "online shopping",
      "product review",
      "unboxing",
      "delivery",
      "smartphone",
    ];
    const term = stockTerms[Math.floor(Math.random() * stockTerms.length)];

    const res = await fetch(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(term)}&per_page=3&size=small&orientation=portrait`,
      { headers: { Authorization: apiKey } }
    );

    if (!res.ok) return null;

    const data = await res.json();
    const videos = data?.videos ?? [];
    if (videos.length === 0) return null;

    const video = videos[Math.floor(Math.random() * videos.length)];
    const file = video.video_files?.find(
      (f: { quality: string; width: number }) =>
        (f.quality === "sd" || f.quality === "hd") && f.width <= 1280
    );

    if (!file?.link) return null;

    // Download
    const tmpDir = path.join(os.tmpdir(), "affiliflow");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const outputPath = path.join(tmpDir, `stock_${Date.now()}.mp4`);
    const videoRes = await fetch(file.link);
    if (!videoRes.ok) return null;

    const buffer = Buffer.from(await videoRes.arrayBuffer());
    fs.writeFileSync(outputPath, buffer);

    return outputPath;
  } catch (e) {
    console.error("Stock video error:", e);
    return null;
  }
}
