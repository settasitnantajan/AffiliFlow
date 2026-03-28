import { NextResponse } from "next/server";
import { runPipeline } from "@/lib/pipeline";

// cron-job.org will POST to this endpoint daily
export async function POST() {
  try {
    const result = await runPipeline();
    return NextResponse.json(result);
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}

// Also support GET for easy testing in browser
export async function GET() {
  return POST();
}
