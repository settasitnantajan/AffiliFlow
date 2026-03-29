import { createServerSupabase } from "@/lib/supabase-server";
import { RefreshButton } from "@/components/refresh-button";
import { QueueList } from "@/components/queue-list";

export const dynamic = "force-dynamic";

export default async function QueuePage() {
  const supabase = createServerSupabase();
  const { data: queue } = await supabase
    .from("product_queue")
    .select("*")
    .order("created_at", { ascending: true });

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-2xl font-bold">คิวสินค้า</h1>
        <RefreshButton />
      </div>
      <p className="text-muted-foreground mb-6">
        สินค้ารอผลิตวีดีโอ (FIFO — เข้าก่อนออกก่อน)
      </p>

      <QueueList items={queue ?? []} />
    </div>
  );
}
