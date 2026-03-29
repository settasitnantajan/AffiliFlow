import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerSupabase();

  const { error } = await supabase
    .from("product_queue")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  // Only allow updating specific fields
  const allowed = ["product_name", "price", "commission_rate"] as const;
  const updates: Record<string, string> = {};
  for (const key of allowed) {
    if (typeof body[key] === "string") {
      updates[key] = body[key].trim();
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const { error } = await supabase
    .from("product_queue")
    .update(updates)
    .eq("id", id)
    .eq("status", "queued"); // only allow editing queued items

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
