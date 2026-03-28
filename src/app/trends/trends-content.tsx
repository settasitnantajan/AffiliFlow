"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Flame, Search, ShoppingCart, Star, BarChart3 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from "recharts";

// Data source: ShopDora Weekly Report — 11-17 Mar 2026
const topSearches = [
  { rank: 1, keyword: "รองเท้าแตะผู้หญิง", en: "Women's sandals", score: 100, hot: true },
  { rank: 2, keyword: "เสื้อ", en: "Shirts", score: 92, hot: true },
  { rank: 3, keyword: "กางเกงขาสั้น", en: "Shorts", score: 85, hot: true },
  { rank: 4, keyword: "เสื้อผ้าผู้หญิง", en: "Women's clothing", score: 78, hot: false },
  { rank: 5, keyword: "รองเท้า", en: "Shoes", score: 72, hot: false },
  { rank: 6, keyword: "รองเท้าแตะผู้ชาย", en: "Men's sandals", score: 65, hot: false },
  { rank: 7, keyword: "รองเท้าแตะ", en: "Sandals", score: 60, hot: false },
  { rank: 8, keyword: "กระเป๋าสะพายข้าง", en: "Shoulder bags", score: 52, hot: false },
  { rank: 9, keyword: "ปืนฉีดน้ำ", en: "Water guns (Songkran)", score: 48, hot: true },
  { rank: 10, keyword: "เก้าอี้แคมป์ปิ้ง", en: "Camping chairs", score: 40, hot: false },
];

// Category breakdown for pie chart
const categoryData = [
  { name: "เครื่องสำอาง", value: 4, color: "#f472b6" },
  { name: "สกินแคร์", value: 2, color: "#a78bfa" },
  { name: "รองเท้า", value: 2, color: "#60a5fa" },
  { name: "สุขภาพ", value: 1, color: "#34d399" },
  { name: "ของเล่น", value: 1, color: "#fbbf24" },
  { name: "ของใช้ครัว", value: 1, color: "#fb923c" },
  { name: "ออกกำลังกาย", value: 1, color: "#f87171" },
  { name: "เครื่องดื่ม", value: 1, color: "#38bdf8" },
  { name: "น้ำหอม", value: 1, color: "#c084fc" },
];

// Data source: Shopee Blog — สินค้าฮิตโซเชียล
const hotProducts = [
  { name: "ขนตาแม่เหล็ก Wosado", category: "เครื่องสำอาง", price: "฿739", priceNum: 739, detail: "ใช้ได้ 90-180 วัน วัสดุดูปองท์" },
  { name: "ลิปไก่ทอด Kage", category: "เครื่องสำอาง", price: "฿249", priceNum: 249, detail: "เนื้อกลอส 13 สี" },
  { name: "กล่องสุ่ม POP MART", category: "ของเล่น", price: "฿380", priceNum: 380, detail: "ดีไซน์ตัวละครสะสม" },
  { name: "เซรั่มสตรอว์เบอร์รี่", category: "สกินแคร์", price: "฿390", priceNum: 390, detail: "ลดสิว ปรับผิวเรียบเนียน" },
  { name: "บลัชลากลาส", category: "เครื่องสำอาง", price: "฿289", priceNum: 289, detail: "เปลี่ยนสีตาม pH 9 สี" },
  { name: "รองเท้า Labotte", category: "รองเท้า", price: "฿872", priceNum: 872, detail: "แมรี่เจน หนังแก้ว 7 สี" },
  { name: "โพรไบโอติก", category: "สุขภาพ", price: "฿390", priceNum: 390, detail: "10 สายพันธุ์จุลินทรีย์" },
  { name: "โทนเนอร์ Mediheal", category: "สกินแคร์", price: "฿599", priceNum: 599, detail: "100 แผ่น ใช้ 2 เดือน" },
  { name: "กล่องหั่นผัก 5in1", category: "ของใช้ครัว", price: "฿77", priceNum: 77, detail: "Food Grade" },
  { name: "Steppers", category: "ออกกำลังกาย", price: "฿699", priceNum: 699, detail: "รองรับ 100-120 กก." },
  { name: "กาแฟ Lamoon", category: "เครื่องดื่ม", price: "฿289", priceNum: 289, detail: "สกัดเย็น 1,000 ml." },
  { name: "น้ำหอมแจนยัวร์", category: "น้ำหอม", price: "฿229", priceNum: 229, detail: "Skin Scent 6-8 ชม." },
  { name: "Crocs Classic", category: "รองเท้า", price: "฿1,990", priceNum: 1990, detail: "Croslite เบาสบาย" },
];

// Price chart data
const priceChartData = hotProducts
  .map((p) => ({ name: p.name, price: p.priceNum }))
  .sort((a, b) => b.price - a.price);

const trendSources = [
  { title: "Shopee สินค้ายอดนิยม", url: "https://shopee.co.th/m/top-all-products" },
  { title: "Shopee Flash Sale", url: "https://shopee.co.th/flash_sale" },
  { title: "ShopDora Weekly Report", url: "https://blog.shopdora.com/en/page/march-23-2026-shopee-thailand-market-weekly-report-summer-campaigns-and-seasonal-searches-heat-up/" },
  { title: "Shopee Blog สินค้าฮิต", url: "https://shopee.co.th/blog/trending-products-on-social-media/" },
  { title: "Google Trends TH", url: "https://trends.google.co.th/trending?geo=TH" },
];

const barColors = ["#fbbf24", "#fbbf24", "#fbbf24", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#94a3b8", "#94a3b8", "#94a3b8"];

export function TrendsContent() {
  return (
    <div className="space-y-6">
      {/* Top 10 search bar chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4" />
            Top 10 คำค้นหาบน Shopee สัปดาห์นี้
          </CardTitle>
          <p className="text-xs text-muted-foreground">ข้อมูลจาก ShopDora — 11-17 มี.ค. 2026 (คะแนนความนิยมสัมพัทธ์)</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={topSearches} layout="vertical" margin={{ left: 10, right: 20 }}>
              <XAxis type="number" domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <YAxis
                type="category"
                dataKey="keyword"
                width={130}
                tick={{ fill: "#e2e8f0", fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
                labelStyle={{ color: "#e2e8f0" }}
                itemStyle={{ color: "#fbbf24" }}
                formatter={(value) => [`${value} คะแนน`, "ความนิยม"]}
              />
              <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                {topSearches.map((_, i) => (
                  <Cell key={i} fill={barColors[i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Two charts side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category pie chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              หมวดสินค้าฮิตจากโซเชียล
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {categoryData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
                  formatter={(value) => [`${value} สินค้า`, "จำนวน"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Price comparison chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              ราคาสินค้าฮิต (บาท)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={priceChartData} layout="vertical" margin={{ left: 5, right: 20 }}>
                <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tick={{ fill: "#e2e8f0", fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
                  labelStyle={{ color: "#e2e8f0" }}
                  formatter={(value) => [`฿${Number(value).toLocaleString()}`, "ราคา"]}
                />
                <Bar dataKey="price" fill="#34d399" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Hot products list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Flame className="h-4 w-4" />
            สินค้าฮิตจากโซเชียล — รายละเอียด
          </CardTitle>
          <p className="text-xs text-muted-foreground">ข้อมูลจาก Shopee Blog</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {hotProducts.map((product) => (
              <div
                key={product.name}
                className="flex gap-3 p-3 rounded-lg bg-muted/50"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{product.detail}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{product.category}</span>
                    <span className="text-xs font-medium text-green-400">{product.price}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Source links */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="h-4 w-4" />
            แหล่งข้อมูลเทรนด์
          </CardTitle>
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
