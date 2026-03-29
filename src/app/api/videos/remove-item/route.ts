import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

// POST /api/videos/remove-item — remove a single video from videos JSON array
export async function POST(req: NextRequest) {
  const { videoResultId, videoUrl } = await req.json();
  if (!videoResultId || !videoUrl) {
    return NextResponse.json({ error: "videoResultId and videoUrl required" }, { status: 400 });
  }

  const supabase = createServerSupabase();

  // Fetch current record
  const { data: record } = await supabase
    .from("video_results")
    .select("videos")
    .eq("id", videoResultId)
    .single();

  if (!record) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const videos = (record.videos as { video_url: string }[]) ?? [];
  const filtered = videos.filter((v) => v.video_url !== videoUrl);

  await supabase
    .from("video_results")
    .update({ videos: filtered })
    .eq("id", videoResultId);

  return NextResponse.json({ success: true, remaining: filtered.length });
}
