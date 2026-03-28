import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const execAsync = promisify(exec);

export interface DownloadResult {
  filePath: string;
  duration: number;
}

// Download video using yt-dlp or direct URL
export async function downloadVideo(
  sourceUrl: string,
  sourceType: string
): Promise<DownloadResult | null> {
  const tmpDir = path.join(os.tmpdir(), "affiliflow");
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const outputPath = path.join(tmpDir, `source_${Date.now()}.mp4`);

  try {
    if (sourceType === "youtube" || sourceType === "tiktok") {
      // Use yt-dlp
      await execAsync(
        `yt-dlp -f "bestvideo[height<=720]+bestaudio/best[height<=720]" --merge-output-format mp4 -o "${outputPath}" "${sourceUrl}"`,
        { timeout: 120000 }
      );
    } else {
      // Direct download (pexels, etc)
      const res = await fetch(sourceUrl);
      if (!res.ok) throw new Error(`Download failed: ${res.status}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(outputPath, buffer);
    }

    if (!fs.existsSync(outputPath)) return null;

    // Get duration
    let duration = 30;
    try {
      const { stdout } = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outputPath}"`
      );
      duration = Math.floor(parseFloat(stdout.trim()));
    } catch {
      // ffprobe not available, use default
    }

    return { filePath: outputPath, duration };
  } catch (e) {
    console.error("Download error:", e);
    return null;
  }
}
