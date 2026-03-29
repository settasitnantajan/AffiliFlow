import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const supabase = createServerSupabase();
  await supabase
    .from("video_results")
    .update({ status: "posted" })
    .eq("id", id);

  return NextResponse.json({ success: true });
}
