import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// GET — list all production items
export async function GET() {
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from("production_items")
    .select("*")
    .order("created_at", { ascending: false });

  return NextResponse.json(data ?? []);
}

// POST — add video to production
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { video_result_id, video_url, caption_text, hashtags, product_links } = body;

  if (!video_url) {
    return NextResponse.json({ error: "video_url required" }, { status: 400 });
  }

  const supabase = createServerSupabase();

  // Check if already added
  const { data: existing } = await supabase
    .from("production_items")
    .select("id")
    .eq("video_url", video_url)
    .limit(1)
    .single();

  if (existing) {
    return NextResponse.json({ error: "already added" }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("production_items")
    .insert({
      video_result_id: video_result_id ?? null,
      video_url,
      caption_text: caption_text ?? "",
      hashtags: hashtags ?? [],
      product_links: product_links ?? [],
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE — remove by video_url
export async function DELETE(req: NextRequest) {
  const { video_url } = await req.json();
  if (!video_url) {
    return NextResponse.json({ error: "video_url required" }, { status: 400 });
  }

  const supabase = createServerSupabase();
  await supabase.from("production_items").delete().eq("video_url", video_url);

  return NextResponse.json({ success: true });
}
