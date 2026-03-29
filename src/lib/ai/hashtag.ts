import { chatCompletion } from "./groq";

export async function generateHashtags(
  keyword: string,
  productName: string
): Promise<string[]> {
  const systemPrompt = `คุณเป็นผู้เชี่ยวชาญด้าน Shopee Video และ TikTok SEO
สร้าง hashtag ที่ช่วยให้วีดีโอถูกค้นพบง่าย
ผสมระหว่าง hashtag ยอดนิยม + hashtag เฉพาะสินค้า
ตอบเป็น hashtag อย่างเดียว คั่นด้วย space ไม่ต้องมีคำอธิบาย`;

  const userPrompt = `สร้าง 12 hashtag สำหรับวีดีโอ Shopee Video
keyword: ${keyword}
สินค้า: ${productName}

ต้องมี: #ShopeeVideo #รีวิวสินค้า
เพิ่ม hashtag ประเภทสินค้า เช่น ถ้าเป็น powerbank ให้มี #powerbank
ห้ามใส่ hashtag เกี่ยวกับ affiliate`;

  const result = await chatCompletion(systemPrompt, userPrompt);

  // Parse hashtags from response
  const hashtags = result
    .split(/[\s,\n]+/)
    .filter((tag) => tag.startsWith("#"))
    .map((tag) => tag.trim())
    .filter(Boolean);

  // Ensure minimum hashtags
  const defaults = [
    "#ShopeeVideo",
    "#รีวิวสินค้า",
    "#สินค้าดี",
    "#ของดีShopee",
  ];

  const uniqueTags = [...new Set([...hashtags, ...defaults])];
  return uniqueTags.slice(0, 15);
}
