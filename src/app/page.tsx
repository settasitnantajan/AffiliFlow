import { createServerSupabase } from "@/lib/supabase-server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import {
  Film, ListOrdered, ShoppingBag, Zap, Flame,
} from "lucide-react";
import { formatThai, formatThaiShort } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createServerSupabase();

  const [
    { count: pipelineCount },
    { count: videosCount },
    { count: queuedCount },
    { count: productsCount },
    { data: recentRuns },
    { data: recentVideos },
    { data: queueItems },
    { data: lastSuccessRun },
  ] = await Promise.all([
    supabase.from("pipeline_runs").select("*", { count: "exact", head: true }),
    supabase.from("video_results").select("*", { count: "exact", head: true }),
    supabase
      .from("product_queue")
      .select("*", { count: "exact", head: true })
      .eq("status", "queued"),
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase
      .from("pipeline_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(5),
    supabase
      .from("video_results")
      .select("id, caption_text, hashtags, status, created_at")
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("product_queue")
      .select("id, product_name, status, created_at")
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(5),
    supabase
      .from("pipeline_runs")
      .select("completed_at")
      .eq("status", "success")
      .order("completed_at", { ascending: false })
      .limit(1),
  ]);

  const lastRunTime = lastSuccessRun?.[0]?.completed_at;
  const lastRunLabel = lastRunTime
    ? formatThaiShort(lastRunTime)
    : "ยังไม่เคยรัน";

  const stats = [
    {
      title: "วีดีโอพร้อมโพสต์",
      value: videosCount ?? 0,
      icon: Film,
      href: "/videos",
      color: "text-blue-400",
    },
    {
      title: "รอคิว",
      value: queuedCount ?? 0,
      icon: ListOrdered,
      href: "/queue",
      color: "text-yellow-400",
    },
    {
      title: "สินค้าวิเคราะห์แล้ว",
      value: productsCount ?? 0,
      icon: ShoppingBag,
      href: "#",
      color: "text-green-400",
    },
    {
      title: "Pipeline รันแล้ว",
      value: pipelineCount ?? 0,
      icon: Zap,
      href: "/pipeline",
      color: "text-purple-400",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header + last run */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">แดชบอร์ด</h1>
          <p className="text-sm text-muted-foreground">
            Pipeline ล่าสุด: {lastRunLabel}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/upload"
            className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            + อัพโหลดสินค้า
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.title} href={stat.href}>
              <Card className="hover:bg-accent/50 transition-colors">
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center justify-between mb-1">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <span className={`text-2xl font-bold ${stat.color}`}>
                      {stat.value}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{stat.title}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Two-column layout: Queue + Recent Videos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Queue preview */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">สินค้ารอคิว</CardTitle>
              <Link
                href="/queue"
                className="text-xs text-blue-400 hover:underline"
              >
                ดูทั้งหมด
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {queueItems && queueItems.length > 0 ? (
              <div className="space-y-3">
                {queueItems.map((item, i) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3"
                  >
                    <span className="text-lg font-bold text-muted-foreground w-6 text-center shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {item.product_name ?? "รอ AI วิเคราะห์..."}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatThaiShort(item.created_at)}
                      </p>
                    </div>
                    <Badge variant="outline">รอคิว</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <ListOrdered className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-3">
                  ไม่มีสินค้าในคิว
                </p>
                <Link
                  href="/upload"
                  className="text-sm text-blue-400 hover:underline"
                >
                  เพิ่มสินค้า
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent videos */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">วีดีโอล่าสุด</CardTitle>
              <Link
                href="/videos"
                className="text-xs text-blue-400 hover:underline"
              >
                ดูทั้งหมด
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentVideos && recentVideos.length > 0 ? (
              <div className="space-y-3">
                {recentVideos.map((v) => (
                  <div key={v.id} className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        {formatThaiShort(v.created_at)}
                      </p>
                      <Badge
                        variant={
                          v.status === "posted" ? "default" : "secondary"
                        }
                      >
                        {v.status}
                      </Badge>
                    </div>
                    <p className="text-sm line-clamp-2">
                      {v.caption_text ?? "-"}
                    </p>
                    {v.hashtags && (
                      <p className="text-xs text-blue-400 truncate">
                        {v.hashtags.slice(0, 3).join(" ")}
                        {v.hashtags.length > 3 && " ..."}
                      </p>
                    )}
                    <Separator className="mt-2" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Film className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  ยังไม่มีวีดีโอ
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pipeline runs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">ประวัติ Pipeline</CardTitle>
            <Link
              href="/pipeline"
              className="text-xs text-blue-400 hover:underline"
            >
              ดูทั้งหมด
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentRuns && recentRuns.length > 0 ? (
            <div className="space-y-3">
              {recentRuns.map((run) => (
                <div
                  key={run.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-border pb-2 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        run.status === "success"
                          ? "bg-green-500/15 text-green-400"
                          : run.status === "failed"
                          ? "bg-red-500/15 text-red-400"
                          : "bg-yellow-500/15 text-yellow-400"
                      }`}
                    >
                      {run.status}
                    </span>
                    <span className="text-sm">
                      {formatThaiShort(run.started_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {run.step_current && (
                      <span>Step: {run.step_current}</span>
                    )}
                    {run.trends_found != null && (
                      <span className="flex items-center gap-1">
                        <Flame className="h-3 w-3" /> {run.trends_found}
                      </span>
                    )}
                    {run.products_found != null && (
                      <span className="flex items-center gap-1">
                        <ShoppingBag className="h-3 w-3" /> {run.products_found}
                      </span>
                    )}
                    {run.videos_produced != null && (
                      <span className="flex items-center gap-1">
                        <Film className="h-3 w-3" /> {run.videos_produced}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Zap className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-1">
                ยังไม่มี Pipeline run
              </p>
              <p className="text-xs text-muted-foreground">
                ตั้ง cron job ที่ /api/pipeline/run
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
