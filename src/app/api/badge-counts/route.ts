import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createServerSupabase();

  const [queueRes, videoRes, productionRes] = await Promise.all([
    supabase
      .from("product_queue")
      .select("*", { count: "exact", head: true })
      .eq("status", "queued"),
    supabase
      .from("video_results")
      .select("*", { count: "exact", head: true })
      .eq("status", "ready"),
    supabase
      .from("production_items")
      .select("*", { count: "exact", head: true })
      .eq("status", "ready"),
  ]);

  return NextResponse.json({
    queue: queueRes.count ?? 0,
    videos: videoRes.count ?? 0,
    production: productionRes.count ?? 0,
  });
}
