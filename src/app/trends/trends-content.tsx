"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Search, Flame, ExternalLink } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { toast } from "sonner";
import { formatThai } from "@/lib/utils";

interface Trend {
  id: string;
  keyword: string;
  source: string;
  trending_score: number;
  created_at: string;
}

const barColors = [
  "#fbbf24", "#fbbf24", "#fbbf24",
  "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa",
  "#94a3b8", "#94a3b8", "#94a3b8",
  "#94a3b8", "#94a3b8", "#94a3b8", "#94a3b8",
  "#94a3b8", "#94a3b8", "#94a3b8", "#94a3b8",
  "#94a3b8", "#94a3b8",
];

const trendSources = [
  { title: "Google Trends TH", url: "https://trends.google.co.th/trending?geo=TH" },
  { title: "Shopee สินค้ายอดนิยม", url: "https://shopee.co.th/m/top-all-products" },
  { title: "Shopee Flash Sale", url: "https://shopee.co.th/flash_sale" },
];

export function TrendsContent({
  initialTrends,
  lastUpdated,
}: {
  initialTrends: Trend[];
  lastUpdated: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const trends = initialTrends;

  const handleRefresh = async () => {
    setLoading(true);
    toast.info("กำลังดึงเทรนด์ใหม่...");
    try {
      const res = await fetch("/api/trends", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success(`อัปเดตเทรนด์แล้ว ${data.count} รายการ`);
        router.refresh();
      } else {
        toast.error(data.error ?? "ดึงเทรนด์ไม่สำเร็จ");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  const chartData = trends.slice(0, 15).map((t) => ({
    keyword: t.keyword.length > 20 ? t.keyword.slice(0, 20) + "…" : t.keyword,
    score: t.trending_score,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">เทรนด์สินค้า</h1>
          <p className="text-muted-foreground text-sm">
            {lastUpdated
              ? `อัปเดตล่าสุด: ${formatThai(lastUpdated)}`
              : "ยังไม่มีข้อมูล — กดอัปเดตเพื่อดึงเทรนด์"}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
          className="gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          {loading ? "กำลังดึง..." : "อัปเดต"}
        </Button>
      </div>

      {trends.length > 0 ? (
        <>
          {/* Bar chart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="h-4 w-4" />
                Trending Now — Google Trends Thailand
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 32)}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="keyword"
                    width={150}
                    tick={{ fill: "#e2e8f0", fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
                    labelStyle={{ color: "#e2e8f0" }}
                    itemStyle={{ color: "#fbbf24" }}
                    formatter={(value) => [`${value}`, "คะแนน"]}
                  />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={barColors[i] ?? "#94a3b8"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Trend list */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Flame className="h-4 w-4" />
                รายการเทรนด์ทั้งหมด ({trends.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {trends.map((t, i) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-muted/50"
                  >
                    <span className={`text-sm font-bold w-6 text-center ${i < 3 ? "text-yellow-400" : "text-muted-foreground"}`}>
                      {i + 1}
                    </span>
                    <span className="text-sm flex-1">{t.keyword}</span>
                    <span className="text-xs text-muted-foreground">
                      {t.trending_score.toLocaleString()}
                    </span>
                    <a
                      href={`https://www.google.com/search?q=${encodeURIComponent(t.keyword)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              ยังไม่มีข้อมูลเทรนด์ — กดปุ่มอัปเดตเพื่อดึงข้อมูลจาก Google Trends
            </p>
            <Button onClick={handleRefresh} disabled={loading}>
              {loading ? "กำลังดึง..." : "ดึงเทรนด์ตอนนี้"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Source links */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">แหล่งข้อมูล</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {trendSources.map((source) => (
              <a
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-muted/50 hover:bg-accent/50 transition-colors"
              >
                <ExternalLink className="h-3 w-3 text-blue-400" />
                {source.title}
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
