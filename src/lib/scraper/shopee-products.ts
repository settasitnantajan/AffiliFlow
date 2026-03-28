import * as cheerio from "cheerio";

export interface ShopeeProduct {
  name: string;
  product_url: string;
  image_url: string;
  price: number;
  commission_rate: number;
  shopee_commission: number;
  seller_commission: number;
  sales_count: number;
  category: string;
}

// Search Shopee for products by keyword and estimate commission
export async function searchShopeeProducts(
  keyword: string
): Promise<ShopeeProduct[]> {
  const products: ShopeeProduct[] = [];

  try {
    const encodedKw = encodeURIComponent(keyword);
    const res = await fetch(
      `https://shopee.co.th/api/v4/search/search_items?keyword=${encodedKw}&limit=10&order=desc&page_type=search&scenario=PAGE_GLOBAL_SEARCH&sort_by=sales`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          "Accept": "application/json",
          "x-api-source": "pc",
          "x-shopee-language": "th",
        },
        next: { revalidate: 0 },
      }
    );

    if (!res.ok) {
      console.error("Shopee search failed:", res.status);
      return getFallbackProducts(keyword);
    }

    const data = await res.json();
    const items = data?.items ?? [];

    for (const item of items.slice(0, 10)) {
      const info = item.item_basic ?? item;
      const shopId = info.shopid ?? info.shop_id;
      const itemId = info.itemid ?? info.item_id;
      const price = (info.price ?? info.price_min ?? 0) / 100000;
      const salesCount = info.sold ?? info.historical_sold ?? 0;
      const name = info.name ?? keyword;
      const image = info.image
        ? `https://cf.shopee.co.th/file/${info.image}`
        : "";

      // Estimate commission by category
      const categoryId = info.catid ?? info.category;
      const commEstimate = estimateCommission(categoryId, price);

      products.push({
        name,
        product_url: `https://shopee.co.th/product/${shopId}/${itemId}`,
        image_url: image,
        price,
        commission_rate: commEstimate.total,
        shopee_commission: commEstimate.shopee,
        seller_commission: commEstimate.seller,
        sales_count: salesCount,
        category: String(categoryId ?? "unknown"),
      });
    }
  } catch (e) {
    console.error("Shopee search error:", e);
    return getFallbackProducts(keyword);
  }

  // Sort by commission * sales (best earning potential)
  products.sort(
    (a, b) =>
      b.commission_rate * b.sales_count - a.commission_rate * a.sales_count
  );

  return products.slice(0, 5);
}

// Commission estimation based on Shopee 2026 rates
function estimateCommission(
  categoryId: number | string | undefined,
  price: number
): { shopee: number; seller: number; total: number } {
  // Base Shopee commission: 4-7% (Social Media channel, 2026)
  const shopeeComm = 5;

  // Extra commission estimate: higher price items tend to have more seller comm
  let sellerComm = 3;
  if (price > 1000) sellerComm = 5;
  if (price > 3000) sellerComm = 8;
  if (price > 5000) sellerComm = 10;

  return {
    shopee: shopeeComm,
    seller: sellerComm,
    total: shopeeComm + sellerComm,
  };
}

function getFallbackProducts(keyword: string): ShopeeProduct[] {
  return [
    {
      name: `${keyword} - สินค้ายอดนิยม`,
      product_url: `https://shopee.co.th/search?keyword=${encodeURIComponent(keyword)}`,
      image_url: "",
      price: 499,
      commission_rate: 8,
      shopee_commission: 5,
      seller_commission: 3,
      sales_count: 1000,
      category: "general",
    },
  ];
}
