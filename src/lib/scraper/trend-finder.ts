import * as cheerio from "cheerio";

export interface TrendResult {
  keyword: string;
  source: string;
  trending_score: number;
}

// Scrape trending keywords from Google Trends TH + Shopee
export async function findTrends(): Promise<TrendResult[]> {
  const results: TrendResult[] = [];

  // 1. Google Trends Daily (Thailand)
  try {
    const res = await fetch(
      "https://trends.google.co.th/trending/rss?geo=TH",
      { next: { revalidate: 0 } }
    );
    const xml = await res.text();
    const $ = cheerio.load(xml, { xmlMode: true });
    $("item").each((i, el) => {
      if (i >= 10) return;
      const title = $(el).find("title").text().trim();
      const traffic = $(el).find("ht\\:approx_traffic").text().replace(/[^0-9]/g, "");
      if (title) {
        results.push({
          keyword: title,
          source: "google_trends",
          trending_score: parseInt(traffic) || (100 - i * 10),
        });
      }
    });
  } catch (e) {
    console.error("Google Trends error:", e);
  }

  // 2. Shopee trending keywords (popular search terms)
  try {
    const res = await fetch(
      "https://shopee.co.th/api/v4/search/search_hint?keyword=&type=0",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          "Accept": "application/json",
        },
        next: { revalidate: 0 },
      }
    );
    if (res.ok) {
      const data = await res.json();
      const hints = data?.data?.hints ?? [];
      hints.slice(0, 10).forEach((hint: { text?: string }, i: number) => {
        if (hint.text) {
          results.push({
            keyword: hint.text,
            source: "shopee_trending",
            trending_score: 90 - i * 5,
          });
        }
      });
    }
  } catch (e) {
    console.error("Shopee hints error:", e);
  }

  // 3. Fallback: popular e-commerce categories
  if (results.length < 5) {
    const fallbacks = [
      "หูฟังบลูทูธ", "เคสโทรศัพท์", "ครีมกันแดด",
      "พาวเวอร์แบงค์", "เสื้อยืด", "รองเท้าผ้าใบ",
      "น้ำหอม", "กระเป๋า", "นาฬิกา", "อาหารเสริม",
    ];
    fallbacks.forEach((kw, i) => {
      results.push({
        keyword: kw,
        source: "fallback",
        trending_score: 50 - i * 3,
      });
    });
  }

  return results;
}
