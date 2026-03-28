import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export async function GET() {
  const supabase = createServerSupabase();

  // Test 1: Check connection
  const { data: tables, error: tablesError } = await supabase
    .from("pipeline_runs")
    .select("id")
    .limit(1);

  if (tablesError) {
    return NextResponse.json({
      status: "error",
      message: "Cannot connect to Supabase or table not found",
      error: tablesError.message,
      hint: "Run the SQL migration in Supabase dashboard first",
    }, { status: 500 });
  }

  // Test 2: Insert a test pipeline run
  const { data: inserted, error: insertError } = await supabase
    .from("pipeline_runs")
    .insert({ status: "test", step_current: "connection_test" })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({
      status: "error",
      message: "Connected but cannot insert",
      error: insertError.message,
    }, { status: 500 });
  }

  // Test 3: Read it back
  const { data: readBack } = await supabase
    .from("pipeline_runs")
    .select("*")
    .eq("id", inserted.id)
    .single();

  // Clean up test data
  await supabase.from("pipeline_runs").delete().eq("id", inserted.id);

  return NextResponse.json({
    status: "success",
    message: "Supabase connection OK! Insert + Read + Delete working.",
    test_record: readBack,
  });
}
