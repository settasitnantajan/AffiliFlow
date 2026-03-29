import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// GET /api/trends — return latest trends from DB
export async function GET() {
  const supabase = createServerSupabase();

  const { data } = await supabase
    .from("trend_searches")
    .select("*")
    .order("trending_score", { ascending: false })
    .limit(20);

  const latest = data?.[0]?.created_at ?? null;

  return NextResponse.json({
    trends: data ?? [],
    lastUpdated: latest,
  });
}

// POST /api/trends — fetch product trends via SerpApi related queries
export async function POST() {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "SERPAPI_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    // 1 keyword = 1 API call — run monthly, ~40 calls per update (within 250 quota)
    const seeds = [
      // Gadget & Electronics
      "หูฟัง", "powerbank", "ลำโพง", "smartwatch", "หูฟังบลูทูธ",
      // Mobile & IT
      "มือถือ", "โน้ตบุ๊ค", "แท็บเล็ต", "คีย์บอร์ด", "เมาส์",
      // Camera & Drone
      "กล้อง", "โดรน", "กล้องวงจรปิด",
      // Beauty & Skincare
      "สกินแคร์", "เครื่องสำอาง", "ครีมกันแดด", "น้ำหอม", "เซรั่ม",
      // Fashion
      "รองเท้า", "กระเป๋า", "เสื้อผ้า", "นาฬิกา", "เครื่องประดับ", "แว่นตา",
      // Home & Appliance
      "เครื่องฟอกอากาศ", "หม้อทอดไร้น้ำมัน", "เครื่องดูดฝุ่น", "พัดลม", "เครื่องซักผ้า",
      // Kitchen
      "หม้อหุงข้าว", "เครื่องชงกาแฟ", "กระทะ",
      // Health & Supplement
      "อาหารเสริม", "วิตามิน", "โปรตีน", "คอลลาเจน",
      // Sport & Outdoor
      "รองเท้าวิ่ง", "จักรยาน", "แคมป์ปิ้ง", "โยคะ",
      // Mom & Baby
      "ของเล่นเด็ก", "รถเข็นเด็ก",
      // Pet
      "อาหารแมว", "อาหารสุนัข",
    ];
    const allTrends: { keyword: string; source: string; trending_score: number }[] = [];
    const seen = new Set<string>();

    for (const seed of seeds) {
      try {
        const url = `https://serpapi.com/search.json?engine=google_trends&q=${encodeURIComponent(seed)}&geo=TH&cat=18&data_type=RELATED_QUERIES&date=today+1-m&hl=th&api_key=${apiKey}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
        if (!res.ok) continue;

        const data = await res.json();
        const rising = data?.related_queries?.rising ?? [];
        const top = data?.related_queries?.top ?? [];

        // Rising queries (most interesting — breakout products)
        for (const item of rising.slice(0, 10)) {
          const kw = item.query?.trim();
          if (!kw || seen.has(kw.toLowerCase())) continue;
          seen.add(kw.toLowerCase());

          // Parse score: "Breakout" = 999, percentage = number
          let score = 100;
          const val = String(item.value ?? "");
          if (val === "Breakout") {
            score = 999;
          } else {
            const num = parseInt(val.replace(/[^0-9]/g, ""));
            if (num) score = num;
          }

          allTrends.push({
            keyword: kw,
            source: `google_trends_rising:${seed}`,
            trending_score: score,
          });
        }

        // Top queries (steady popular)
        for (const item of top.slice(0, 5)) {
          const kw = item.query?.trim();
          if (!kw || seen.has(kw.toLowerCase())) continue;
          seen.add(kw.toLowerCase());
          allTrends.push({
            keyword: kw,
            source: `google_trends_top:${seed}`,
            trending_score: item.value ?? 50,
          });
        }
      } catch {
        // skip failed seed
      }
    }

    // Sort by score descending
    allTrends.sort((a, b) => b.trending_score - a.trending_score);
    const finalTrends = allTrends.slice(0, 20);

    if (finalTrends.length === 0) {
      return NextResponse.json({ error: "No product trends found" }, { status: 404 });
    }

    // Save to DB — clear old + insert fresh
    const supabase = createServerSupabase();
    await supabase.from("trend_searches").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("trend_searches").insert(finalTrends);

    return NextResponse.json({
      success: true,
      count: finalTrends.length,
      trends: finalTrends,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
