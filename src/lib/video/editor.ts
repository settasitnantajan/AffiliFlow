import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const execFileAsync = promisify(execFile);

export interface EditResult {
  filePath: string;
  duration: number;
}

// Cut video to 30 seconds + add text overlay
export async function editVideo(
  inputPath: string,
  productName: string,
  price: number,
  targetDuration: number = 30
): Promise<EditResult | null> {
  const tmpDir = path.join(os.tmpdir(), "affiliflow");
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const outputPath = path.join(tmpDir, `edited_${Date.now()}.mp4`);

  try {
    // Check if ffmpeg is available
    try {
      await execFileAsync("ffmpeg", ["-version"]);
    } catch {
      // FFmpeg not installed — just copy/trim without overlay
      console.warn("FFmpeg not found, copying source file as-is");
      fs.copyFileSync(inputPath, outputPath);
      return { filePath: outputPath, duration: targetDuration };
    }

    // Sanitize text for ffmpeg drawtext filter (escape special chars)
    const safeProductName = productName
      .replace(/[\\':;$`"]/g, " ")
      .slice(0, 40);
    const priceText = `฿${price.toLocaleString()}`;

    // FFmpeg: cut to 30s + text overlay (product name + price)
    // Use execFile with args array to prevent shell injection
    const vf = [
      `drawtext=text='${safeProductName}':fontsize=28:fontcolor=white:borderw=2:bordercolor=black:x=(w-text_w)/2:y=h-100`,
      `drawtext=text='${priceText}':fontsize=36:fontcolor=yellow:borderw=2:bordercolor=black:x=(w-text_w)/2:y=h-55`,
    ].join(",");

    await execFileAsync("ffmpeg", [
      "-y", "-i", inputPath,
      "-t", String(targetDuration),
      "-vf", vf,
      "-c:v", "libx264", "-preset", "fast", "-crf", "23",
      "-c:a", "aac", "-b:a", "128k",
      "-movflags", "+faststart",
      outputPath,
    ], { timeout: 120000 });

    if (!fs.existsSync(outputPath)) return null;

    return { filePath: outputPath, duration: targetDuration };
  } catch (e) {
    console.error("Edit error:", e);

    // Fallback: just copy the file
    try {
      fs.copyFileSync(inputPath, outputPath);
      return { filePath: outputPath, duration: targetDuration };
    } catch {
      return null;
    }
  }
}
