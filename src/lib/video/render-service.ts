const RENDER_URL = process.env.RENDER_VIDEO_URL || "https://affiliflow-video-service.onrender.com";
const SERVICE_SECRET = process.env.RENDER_VIDEO_SECRET || "";

export async function downloadVideoViaRender(
  productName: string
): Promise<string | null> {
  const res = await fetch(`${RENDER_URL}/download`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-service-secret": SERVICE_SECRET,
    },
    body: JSON.stringify({ productName }),
    signal: AbortSignal.timeout(110000),
  });

  if (!res.ok) {
    console.warn("Render video service error:", res.status);
    return null;
  }

  const data = await res.json();
  return data.videoUrl ?? null;
}
