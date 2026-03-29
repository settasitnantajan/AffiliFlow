import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

// DELETE — remove from production
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerSupabase();

  await supabase.from("production_items").delete().eq("id", id);
  return NextResponse.json({ success: true });
}

// PATCH — mark as posted
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerSupabase();

  await supabase
    .from("production_items")
    .update({ status: "posted" })
    .eq("id", id);

  return NextResponse.json({ success: true });
}
