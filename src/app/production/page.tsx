import { createServerSupabase } from "@/lib/supabase-server";
import { ProductionList } from "./production-list";

export const dynamic = "force-dynamic";

export default async function ProductionPage() {
  const supabase = createServerSupabase();
  const { data: items } = await supabase
    .from("production_items")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <ProductionList items={items ?? []} />
    </div>
  );
}
