import { chatCompletion } from "./groq";

interface ProductInfo {
  name: string;
  price: number;
  shopeeUrl?: string;
}

interface CaptionResult {
  caption: string;
  hashtags: string[];
}

/**
 * Generate caption + hashtags in one prompt so AI can fit within 150 chars total.
 */
export async function generateCaptionAndHashtags(
  products: ProductInfo[]
): Promise<CaptionResult> {
  const mainProduct = products[0];

  const priceStr = `฿${Math.round(mainProduct.price).toLocaleString("th-TH")}`;

  const systemPrompt = `คุณเป็นนักรีวิวสินค้าออนไลน์ในประเทศไทย
สร้าง caption + hashtag สำหรับวีดีโอ Shopee Video

กฎสำคัญ:
- caption + hashtag รวมกันต้องได้ 140-150 ตัวอักษรพอดี (นับทุกตัวอักษร รวม space และ #)
- ถ้ายังไม่ถึง 140 ให้เพิ่ม hashtag จนครบ
- caption: ดึงดูด เขียนภาษาไทย ใช้อิโมจิได้ บอกจุดเด่นสินค้า มี CTA เช่น "กดตะกร้าเลย!"
- hashtag: เน้นประเภทสินค้า เช่น #powerbank #ลำโพง #หูฟัง เพิ่มได้เรื่อยๆจนเต็ม 150
- ห้ามพูดเรื่อง affiliate, คอมมิชชั่น, รายได้ เด็ดขาด
- ห้ามใส่ลิงก์
- ราคาแสดงเป็นจำนวนเต็ม

ตอบในรูปแบบนี้เท่านั้น (2 บรรทัด):
caption ข้อความ
hashtags #tag1 #tag2 #tag3`;

  const userPrompt = `สินค้า: ${mainProduct.name} ราคา ${priceStr}

สร้าง caption + hashtag รวมกันให้ได้ 140-150 ตัวอักษรพอดี ห้ามน้อยกว่า 140`;

  const result = await chatCompletion(systemPrompt, userPrompt);

  // Parse response
  const lines = result.trim().split("\n").filter(Boolean);
  let captionLine = "";
  let hashtagLine = "";

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.startsWith("caption")) {
      captionLine = line.replace(/^caption\s*/i, "").trim();
    } else if (lower.startsWith("hashtag")) {
      hashtagLine = line.replace(/^hashtags?\s*/i, "").trim();
    }
  }

  // Fallback: if no labeled lines, first line = caption, last line with # = hashtags
  if (!captionLine && !hashtagLine) {
    for (const line of lines) {
      if (line.includes("#")) {
        hashtagLine = line.trim();
      } else if (!captionLine) {
        captionLine = line.trim();
      }
    }
  }

  if (!captionLine) captionLine = lines[0]?.trim() ?? mainProduct.name;

  const hashtags = hashtagLine
    .split(/[\s,]+/)
    .filter((t) => t.startsWith("#"))
    .filter(Boolean);

  // Hard cap: trim hashtags if combined > 150
  let combined = `${captionLine}\n${hashtags.join(" ")}`;
  const finalHashtags = [...hashtags];
  while (combined.length > 150 && finalHashtags.length > 1) {
    finalHashtags.pop();
    combined = `${captionLine}\n${finalHashtags.join(" ")}`;
  }

  // Pad with extra hashtags if under 140
  const fillers = ["#สินค้าดี", "#ของดีShopee", "#ShopeeVideo", "#รีวิว", "#แนะนำ", "#ราคาถูก", "#คุ้มค่า", "#ของมันต้องมี", "#สินค้าแนะนำ", "#ดีจริง"];
  for (const filler of fillers) {
    combined = `${captionLine}\n${finalHashtags.join(" ")}`;
    if (combined.length >= 140) break;
    if (!finalHashtags.includes(filler)) {
      const test = `${captionLine}\n${[...finalHashtags, filler].join(" ")}`;
      if (test.length <= 150) {
        finalHashtags.push(filler);
      }
    }
  }

  return { caption: captionLine, hashtags: finalHashtags };
}

/** @deprecated Use generateCaptionAndHashtags instead */
export async function generateCaption(
  products: ProductInfo[]
): Promise<string> {
  const { caption } = await generateCaptionAndHashtags(products);
  return caption;
}
