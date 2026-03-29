import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

// Extract storage file path from Supabase public URL
function getStoragePath(url: string): string | null {
  const match = url.match(/\/storage\/v1\/object\/public\/videos\/(.+)$/);
  return match?.[1] ?? null;
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerSupabase();

  // Fetch record first to get video URLs
  const { data: record } = await supabase
    .from("video_results")
    .select("video_url, videos")
    .eq("id", id)
    .single();

  // Collect all video URLs to delete from storage
  const filesToDelete: string[] = [];
  if (record) {
    // Legacy single video
    if (record.video_url) {
      const path = getStoragePath(record.video_url);
      if (path) filesToDelete.push(path);
    }
    // Multi videos
    const videos = (record.videos as { video_url: string }[]) ?? [];
    for (const v of videos) {
      const path = getStoragePath(v.video_url);
      if (path && !filesToDelete.includes(path)) filesToDelete.push(path);
    }
  }

  // Delete from storage
  if (filesToDelete.length > 0) {
    await supabase.storage.from("videos").remove(filesToDelete);
  }

  // Delete DB record
  const { error } = await supabase
    .from("video_results")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, deletedFiles: filesToDelete.length });
}
