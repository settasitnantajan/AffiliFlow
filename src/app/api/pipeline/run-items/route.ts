import { NextRequest, NextResponse } from "next/server";
import { runPipeline } from "@/lib/pipeline";
import { getErrorMessage } from "@/lib/utils";

/**
 * POST /api/pipeline/run-items
 * Body: { ids: string[] }
 * Runs pipeline sequentially for each queue item ID.
 */
export async function POST(req: NextRequest) {
  try {
    const { ids } = await req.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "ids[] is required" },
        { status: 400 }
      );
    }

    const results: { id: string; success: boolean; error?: string }[] = [];

    for (const id of ids) {
      try {
        const result = await runPipeline(id);
        results.push({ id, success: result.success !== false });
      } catch (e) {
        results.push({ id, success: false, error: getErrorMessage(e) });
      }
    }

    const allSuccess = results.every((r) => r.success);
    return NextResponse.json({ success: allSuccess, results });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(e) },
      { status: 500 }
    );
  }
}
