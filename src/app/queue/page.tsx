import { createServerSupabase } from "@/lib/supabase-server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshButton } from "@/components/refresh-button";
import Link from "next/link";
import { ListOrdered } from "lucide-react";
import { formatThai } from "@/lib/utils";

export const dynamic = "force-dynamic";

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  queued: "outline",
  processing: "default",
  done: "secondary",
  failed: "destructive",
};

export default async function QueuePage() {
  const supabase = createServerSupabase();
  const { data: queue } = await supabase
    .from("product_queue")
    .select("*")
    .order("created_at", { ascending: true });

  const pending = queue?.filter((q) => q.status === "queued") ?? [];
  const others = queue?.filter((q) => q.status !== "queued") ?? [];

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-2xl font-bold">คิวสินค้า</h1>
        <RefreshButton />
      </div>
      <p className="text-muted-foreground mb-6">
        สินค้ารอผลิตวีดีโอ (FIFO — เข้าก่อนออกก่อน)
      </p>

      {/* Pending queue */}
      <h2 className="text-lg font-semibold mb-3">
        รอคิว ({pending.length})
      </h2>
      {pending.length > 0 ? (
        <div className="space-y-3 mb-8">
          {pending.map((item, i) => (
            <Card key={item.id}>
              <CardContent className="py-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-muted-foreground w-8">
                      {i + 1}
                    </span>
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt="Screenshot"
                        className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border"
                      />
                    )}
                    <Badge className="sm:hidden" variant={statusColors[item.status] ?? "outline"}>
                      {item.status}
                    </Badge>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium break-words">
                      {item.product_name ?? "รอ AI วิเคราะห์..."}
                    </p>
                    <a
                      href={item.shopee_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline break-all block"
                    >
                      {item.shopee_url}
                    </a>
                    <p className="text-xs text-muted-foreground mt-1">
                      เพิ่มเมื่อ{" "}
                      {formatThai(item.created_at)}
                    </p>
                  </div>
                  <Badge className="hidden sm:inline-flex" variant={statusColors[item.status] ?? "outline"}>
                    {item.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="mb-8">
          <CardContent className="py-8 text-center">
            <ListOrdered className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground text-sm mb-4">
              ไม่มีสินค้าในคิว — เพิ่มสินค้าเพื่อเริ่มผลิตวีดีโอ
            </p>
            <Link
              href="/upload"
              className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              ไปหน้าอัพโหลด
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Processed items */}
      {others.length > 0 && (
        <>
          <h2 className="text-lg font-semibold mb-3">
            ประวัติ ({others.length})
          </h2>
          <div className="space-y-3">
            {others.map((item) => (
              <Card key={item.id}>
                <CardContent className="py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                    <div className="flex items-center gap-3">
                      {item.image_url && (
                        <img
                          src={item.image_url}
                          alt="Screenshot"
                          className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-lg border"
                        />
                      )}
                      <Badge className="sm:hidden" variant={statusColors[item.status] ?? "outline"}>
                        {item.status}
                      </Badge>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium break-words">
                        {item.product_name ?? "-"}
                      </p>
                      <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                        {item.price && <span>{item.price}</span>}
                        {item.commission_rate && (
                          <span className="text-green-500">
                            ค่าคอม {item.commission_rate}
                          </span>
                        )}
                      </div>
                      {item.processed_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          ประมวลผลเมื่อ{" "}
                          {formatThai(item.processed_at)}
                        </p>
                      )}
                    </div>
                    <Badge className="hidden sm:inline-flex" variant={statusColors[item.status] ?? "outline"}>
                      {item.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
