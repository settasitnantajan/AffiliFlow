import { chatCompletion } from "./groq";

interface ProductInfo {
  name: string;
  price: number;
  commission_rate: number;
}

export async function generateCaption(
  products: ProductInfo[]
): Promise<string> {
  const productList = products
    .map(
      (p, i) =>
        `${i + 1}. ${p.name} - ราคา ฿${p.price.toLocaleString()} (คอมมิชชั่น ${p.commission_rate}%)`
    )
    .join("\n");

  const systemPrompt = `คุณเป็นผู้เชี่ยวชาญด้าน Shopee Affiliate Marketing ในประเทศไทย
สร้าง caption สำหรับวีดีโอ Shopee Video ที่ดึงดูดและกระตุ้นให้คนกดซื้อ
เขียนเป็นภาษาไทย ใช้อิโมจิอย่างเหมาะสม
ต้องมี Call-to-Action (CTA) ชัดเจน เช่น "กดลิงก์ในตะกร้าเลย!"
ความยาวไม่เกิน 300 ตัวอักษร`;

  const userPrompt = `สร้าง caption สำหรับวีดีโอรีวิวสินค้าเหล่านี้:
${productList}

เน้นสินค้าตัวแรกเป็นหลัก แต่กล่าวถึงสินค้าอื่นๆ ด้วย
ต้องดึงดูด กระชับ มี CTA`;

  return chatCompletion(systemPrompt, userPrompt);
}
