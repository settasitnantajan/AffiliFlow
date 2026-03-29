interface LensProduct {
  title: string;
  price: string;
  source: string;
}

export interface LensResult {
  product_name: string;
  price: string;
  products: LensProduct[];
}

/**
 * Use Google Lens via SerpApi to identify product from image URL.
 * Returns null if SERPAPI_KEY is not set or quota exceeded.
 */
export async function identifyProductWithLens(
  imageUrl: string
): Promise<LensResult | null> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) return null;

  try {
    const url = `https://serpapi.com/search.json?engine=google_lens&type=products&url=${encodeURIComponent(imageUrl)}&hl=th&country=th&api_key=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });

    if (!res.ok) return null;

    const data = await res.json();
    const matches = data?.visual_matches ?? data?.products ?? [];

    if (matches.length === 0) return null;

    const products: LensProduct[] = matches.slice(0, 5).map(
      (m: { title?: string; price?: { value?: string }; source?: string }) => ({
        title: m.title ?? "",
        price: m.price?.value ?? "",
        source: m.source ?? "",
      })
    );

    const best = products[0];

    // Clean title: remove "| Shopee Thailand", "| Lazada.co.th" etc.
    const cleanTitle = best.title.replace(/\s*\|\s*(Shopee|Lazada|Lazada\.co\.th|Shopee Thailand).*$/i, "").trim();

    return {
      product_name: cleanTitle || best.title,
      price: best.price,
      products,
    };
  } catch (e) {
    console.warn("Google Lens error:", e instanceof Error ? e.message : e);
    return null;
  }
}
