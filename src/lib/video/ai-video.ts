import { execFile } from "child_process";
import { readFile, unlink, writeFile, mkdir, stat } from "fs/promises";
import { existsSync } from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { createServerSupabase } from "../supabase-server";
import { generateReviewScript, classifyProductCategory } from "../ai/script";

// Temp directory for all AI video work
const AI_VIDEO_DIR = join(tmpdir(), "affiliflow-ai-video");

// Path to presenter image (avatar for talking head)
const PRESENTER_DIR = resolve("public/presenters");

// Wav2Lip location
const WAV2LIP_DIR = resolve(process.env.WAV2LIP_PATH ?? join(process.env.HOME ?? "~", "Wav2Lip"));

// Python venv (needs Python 3.11, not system 3.14)
const VENV_PYTHON = join(
  resolve(process.env.SADTALKER_PATH ?? join(process.env.HOME ?? "~", "SadTalker")),
  "venv", "bin", "python3"
);

// ──────────────────────────────────────────────
// Shell helper
// ──────────────────────────────────────────────
function run(
  cmd: string,
  args: string[],
  timeout = 120000,
  cwd?: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = execFile(
      cmd,
      args,
      { timeout, maxBuffer: 10 * 1024 * 1024, cwd },
      (err, stdout) => {
        if (err) reject(err);
        else resolve(stdout);
      }
    );
    proc.stderr?.on("data", (d: Buffer) => {
      const line = d.toString().trim();
      if (line) console.log(`[${cmd}] ${line}`);
    });
  });
}

// ──────────────────────────────────────────────
// Step A: Search product image (PNG with white/transparent bg)
// ──────────────────────────────────────────────
async function searchProductImage(productName: string): Promise<string | null> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    console.warn("SERPER_API_KEY not set — skipping product image search");
    return null;
  }

  try {
    const res = await fetch("https://google.serper.dev/images", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: `${productName} product PNG white background`,
        gl: "th",
        num: 5,
      }),
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json();
    const images = data.images ?? [];

    // Pick the first valid image
    for (const img of images) {
      const url: string = img.imageUrl ?? img.link;
      if (!url) continue;

      // Download and save
      try {
        const imgRes = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!imgRes.ok) continue;

        const buffer = Buffer.from(await imgRes.arrayBuffer());
        if (buffer.length < 5000) continue; // too small

        const ext = url.includes(".png") ? ".png" : ".jpg";
        const outPath = join(AI_VIDEO_DIR, `product_image${ext}`);
        await writeFile(outPath, buffer);
        console.log(`Product image saved: ${outPath} (${(buffer.length / 1024).toFixed(0)}KB)`);
        return outPath;
      } catch {
        continue;
      }
    }
  } catch (e) {
    console.warn("Product image search failed:", e instanceof Error ? e.message : e);
  }

  return null;
}

// ──────────────────────────────────────────────
// Step B: edge-tts → Thai speech .mp3
// ──────────────────────────────────────────────
type VoiceGender = "female" | "male";

async function textToSpeech(
  text: string,
  gender: VoiceGender = "female"
): Promise<string> {
  const voice =
    gender === "female" ? "th-TH-PremwadeeNeural" : "th-TH-NiwatNeural";
  const outputPath = join(AI_VIDEO_DIR, `tts_${Date.now()}.mp3`);

  await run(
    "edge-tts",
    ["--text", text, "--voice", voice, "--write-media", outputPath],
    30000
  );

  const st = await stat(outputPath);
  console.log(`TTS output: ${outputPath} (${(st.size / 1024).toFixed(0)}KB)`);
  return outputPath;
}

// ──────────────────────────────────────────────
// Step C: Wav2Lip → talking head video (lip sync)
// ──────────────────────────────────────────────
async function generateTalkingHead(
  presenterImage: string,
  audioPath: string
): Promise<string> {
  const outputPath = join(AI_VIDEO_DIR, `wav2lip_${Date.now()}.mp4`);

  if (!existsSync(WAV2LIP_DIR)) {
    throw new Error(
      `Wav2Lip not found at ${WAV2LIP_DIR}. Set WAV2LIP_PATH env or clone to ~/Wav2Lip`
    );
  }

  const checkpointPath = join(WAV2LIP_DIR, "checkpoints", "checkpoints", "Wav2Lip-SD-GAN.pt");
  if (!existsSync(checkpointPath)) {
    throw new Error(`Wav2Lip model not found at ${checkpointPath}`);
  }

  await run(
    VENV_PYTHON,
    [
      join(WAV2LIP_DIR, "inference.py"),
      "--checkpoint_path", checkpointPath,
      "--face", presenterImage,
      "--audio", audioPath,
      "--outfile", outputPath,
      "--static", "True",
      "--pads", "0", "10", "0", "0",
    ],
    300000, // 5 min timeout (Wav2Lip is fast, ~30s for 10s video)
    WAV2LIP_DIR
  );

  if (!existsSync(outputPath)) {
    throw new Error("Wav2Lip did not produce output video");
  }

  const st = await stat(outputPath);
  console.log(`Wav2Lip output: ${outputPath} (${(st.size / 1024).toFixed(0)}KB)`);
  return outputPath;
}

// ──────────────────────────────────────────────
// Step D-1: Generate text overlay image using Python Pillow
// (avoids needing ffmpeg drawtext/freetype)
// ──────────────────────────────────────────────
async function generateTextOverlay(
  productName: string,
  price: string,
  width: number = 1080,
  height: number = 1920
): Promise<string> {
  const overlayPath = join(AI_VIDEO_DIR, `text_overlay_${Date.now()}.png`);
  const safeName = productName.slice(0, 35);

  // Use SadTalker's venv python (has Pillow installed)
  const script = `
import sys
from PIL import Image, ImageDraw, ImageFont

w, h = ${width}, ${height}
img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# Try to find a Thai-capable font
font_paths = [
    '/System/Library/Fonts/Supplemental/Thonburi.ttc',
    '/System/Library/Fonts/Thonburi.ttc',
    '/Library/Fonts/Thonburi.ttc',
    '/System/Library/Fonts/Helvetica.ttc',
]
name_font = None
price_font = None
for fp in font_paths:
    try:
        name_font = ImageFont.truetype(fp, 36)
        price_font = ImageFont.truetype(fp, 48)
        break
    except:
        continue
if not name_font:
    name_font = ImageFont.load_default()
    price_font = ImageFont.load_default()

name_text = """${safeName.replace(/"/g, '\\"')}"""
price_text = """${price.replace(/"/g, '\\"')}"""

# Draw product name with shadow (centered, near bottom)
name_bbox = draw.textbbox((0, 0), name_text, font=name_font)
name_w = name_bbox[2] - name_bbox[0]
name_x = (w - name_w) // 2
name_y = h - 180

# Shadow
draw.text((name_x+2, name_y+2), name_text, fill=(0, 0, 0, 200), font=name_font)
draw.text((name_x, name_y), name_text, fill=(255, 255, 255, 255), font=name_font)

# Draw price with shadow (centered, below name)
price_bbox = draw.textbbox((0, 0), price_text, font=price_font)
price_w = price_bbox[2] - price_bbox[0]
price_x = (w - price_w) // 2
price_y = h - 120

draw.text((price_x+2, price_y+2), price_text, fill=(0, 0, 0, 200), font=price_font)
draw.text((price_x, price_y), price_text, fill=(255, 255, 0, 255), font=price_font)

img.save("""${overlayPath}""")
`;

  const scriptPath = join(AI_VIDEO_DIR, "gen_overlay.py");
  await writeFile(scriptPath, script);
  await run(VENV_PYTHON, [scriptPath], 15000);

  return overlayPath;
}

// ──────────────────────────────────────────────
// Step D-2: FFmpeg compose — avatar + product image + text overlay image
// ──────────────────────────────────────────────
async function composeVideo(
  talkingHeadPath: string,
  productImagePath: string | null,
  productName: string,
  price: string
): Promise<string> {
  const outputPath = join(AI_VIDEO_DIR, `final_${Date.now()}.mp4`);

  // Generate text overlay as transparent PNG
  const textOverlayPath = await generateTextOverlay(productName, price);

  // Build filter chain using image overlays (no drawtext needed)
  const filters: string[] = [];
  let inputCount = 1; // [0] = talking head video

  const args = ["-y", "-i", talkingHeadPath];

  if (productImagePath) {
    args.push("-i", productImagePath); // [1] = product image
    inputCount++;
  }
  args.push("-i", textOverlayPath); // [inputCount] = text overlay
  const textIdx = inputCount;

  if (productImagePath) {
    filters.push(
      "[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2[base]",
      "[1:v]scale=300:300:force_original_aspect_ratio=decrease,format=rgba[product]",
      "[base][product]overlay=W-w-40:40[composed]",
      `[${textIdx}:v]scale=1080:1920[txt]`,
      "[composed][txt]overlay=0:0[out]"
    );
  } else {
    filters.push(
      "[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2[base]",
      `[${textIdx}:v]scale=1080:1920[txt]`,
      "[base][txt]overlay=0:0[out]"
    );
  }

  args.push(
    "-filter_complex", filters.join(";"),
    "-map", "[out]",
    "-map", "0:a?",
    "-c:v", "libx264", "-preset", "fast", "-crf", "23",
    "-c:a", "aac", "-b:a", "128k",
    "-t", "15",
    "-movflags", "+faststart",
    outputPath
  );

  await run("ffmpeg", args, 120000);

  const st = await stat(outputPath);
  console.log(`Composed video: ${outputPath} (${(st.size / 1024 / 1024).toFixed(1)}MB)`);
  return outputPath;
}

// ──────────────────────────────────────────────
// Step E: Upload to Supabase
// ──────────────────────────────────────────────
async function uploadToSupabase(videoPath: string): Promise<string | null> {
  const buffer = await readFile(videoPath);
  const fileName = `ai_video_${Date.now()}.mp4`;
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

  const { data } = supabase.storage.from("videos").getPublicUrl(fileName);
  return data.publicUrl;
}

// ──────────────────────────────────────────────
// Choose presenter image (random male/female)
// ──────────────────────────────────────────────
function getPresenterImage(): { path: string; gender: VoiceGender } {
  // Check for presenter images in public/presenters/
  const femalePresenter = join(PRESENTER_DIR, "female.jpg");
  const malePresenter = join(PRESENTER_DIR, "male.jpg");
  const defaultPresenter = join(resolve("public"), "presenter.jpg");

  if (existsSync(femalePresenter) && existsSync(malePresenter)) {
    const isFemale = Math.random() > 0.5;
    return {
      path: isFemale ? femalePresenter : malePresenter,
      gender: isFemale ? "female" : "male",
    };
  }

  if (existsSync(femalePresenter))
    return { path: femalePresenter, gender: "female" };
  if (existsSync(malePresenter))
    return { path: malePresenter, gender: "male" };
  if (existsSync(defaultPresenter))
    return { path: defaultPresenter, gender: "female" };

  throw new Error(
    "No presenter image found. Place a face photo at public/presenters/female.jpg or public/presenters/male.jpg"
  );
}

// ──────────────────────────────────────────────
// Main orchestrator
// ──────────────────────────────────────────────
export interface AiVideoResult {
  videoUrl: string | null;
  script: string;
  category: string;
  gender: VoiceGender;
}

export async function generateAiVideo(
  productName: string,
  price: string,
  commissionRate: string,
  onProgress?: (step: string) => void
): Promise<AiVideoResult> {
  // Ensure temp directory
  await mkdir(AI_VIDEO_DIR, { recursive: true });

  const tempFiles: string[] = [];

  try {
    // 1. Classify product category
    onProgress?.("วิเคราะห์ประเภทสินค้า");
    const category = await classifyProductCategory(productName);
    console.log(`Product category: ${category}`);

    // 2. Generate review script
    onProgress?.("สร้างสคริปต์รีวิว");
    const script = await generateReviewScript({
      productName,
      price,
      commissionRate,
      category,
    });
    console.log(`Review script (${script.length} chars): ${script.slice(0, 80)}...`);

    // 3. Get presenter image
    const presenter = getPresenterImage();
    console.log(`Presenter: ${presenter.gender} (${presenter.path})`);

    // 4. Search product image (in parallel with TTS)
    onProgress?.("สร้างเสียงพูด + ค้นหารูปสินค้า");
    const [audioPath, productImagePath] = await Promise.all([
      textToSpeech(script, presenter.gender),
      searchProductImage(productName),
    ]);
    tempFiles.push(audioPath);
    if (productImagePath) tempFiles.push(productImagePath);

    // 5. Wav2Lip → talking head video (lip sync)
    onProgress?.("สร้างวีดีโออวตาร AI (Wav2Lip)");
    const talkingHeadPath = await generateTalkingHead(
      presenter.path,
      audioPath
    );
    tempFiles.push(talkingHeadPath);

    // 6. FFmpeg compose → final video
    onProgress?.("รวมวีดีโอ + overlay ข้อมูลสินค้า");
    const composedPath = await composeVideo(
      talkingHeadPath,
      productImagePath,
      productName,
      price
    );
    tempFiles.push(composedPath);

    // 7. Upload to Supabase
    onProgress?.("อัปโหลดวีดีโอ");
    const videoUrl = await uploadToSupabase(composedPath);

    return { videoUrl, script, category, gender: presenter.gender };
  } finally {
    // Cleanup temp files
    for (const f of tempFiles) {
      await unlink(f).catch(() => {});
    }
  }
}
