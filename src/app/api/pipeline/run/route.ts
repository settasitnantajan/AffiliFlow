import { NextResponse } from "next/server";
import { runPipeline } from "@/lib/pipeline";
import { getErrorMessage } from "@/lib/utils";

// cron-job.org will POST to this endpoint daily
export async function POST() {
  try {
    const result = await runPipeline();
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(e) },
      { status: 500 }
    );
  }
}

// Also support GET for easy testing in browser
export async function GET() {
  return POST();
}
