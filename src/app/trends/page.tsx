import { createServerSupabase } from "@/lib/supabase-server";
import { TrendsContent } from "./trends-content";

export const dynamic = "force-dynamic";

export default async function TrendsPage() {
  const supabase = createServerSupabase();

  const { data: trends } = await supabase
    .from("trend_searches")
    .select("*")
    .order("trending_score", { ascending: false })
    .limit(20);

  const lastUpdated = trends?.[0]?.created_at ?? null;

  return (
    <div>
      <TrendsContent
        initialTrends={trends ?? []}
        lastUpdated={lastUpdated}
      />
    </div>
  );
}
