import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  const supabase = createServerSupabase();

  const { data: run } = await supabase
    .from("pipeline_runs")
    .select("id, status, step_current, progress, started_at, error_log")
    .eq("status", "running")
    .order("started_at", { ascending: false })
    .limit(1)
    .single();

  // Mark stale runs as failed (e.g. server crashed mid-pipeline)
  if (run) {
    const elapsed = Date.now() - new Date(run.started_at).getTime();
    if (elapsed > STALE_THRESHOLD_MS) {
      await supabase
        .from("pipeline_runs")
        .update({
          status: "failed",
          error_log: "Pipeline หมดเวลา (stale run)",
          completed_at: new Date().toISOString(),
        })
        .eq("id", run.id);
      // Fall through to "not running" below
    }
  }

  if (!run || Date.now() - new Date(run.started_at).getTime() > STALE_THRESHOLD_MS) {
    // No running pipeline — check last completed run
    const { data: lastRun } = await supabase
      .from("pipeline_runs")
      .select("id, status, step_current, progress, started_at, completed_at, error_log")
      .in("status", ["success", "failed"])
      .order("started_at", { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      running: false,
      lastRun: lastRun ?? null,
    });
  }

  return NextResponse.json({
    running: true,
    id: run.id,
    status: run.status,
    step_current: run.step_current,
    progress: run.progress ?? 0,
    started_at: run.started_at,
    error_log: run.error_log,
  });
}
