import { chatCompletion } from "./groq";

interface ProductInfo {
  name: string;
  price: number;
  shopeeUrl?: string;
}

export async function generateCaption(
  products: ProductInfo[]
): Promise<string> {
  const mainProduct = products[0];
  const otherProducts = products.slice(1);

  // Format price as integer (no decimals)
  const priceStr = `฿${Math.round(mainProduct.price).toLocaleString("th-TH")}`;

  const systemPrompt = `คุณเป็นนักรีวิวสินค้าออนไลน์ชื่อดังในประเทศไทย
สร้าง caption สำหรับวีดีโอ Shopee Video ที่ดึงดูดและเชิญชวนให้คนอยากลองใช้สินค้า
เขียนเป็นภาษาไทย ใช้อิโมจิอย่างเหมาะสม

กฎสำคัญ:
- ห้ามพูดเรื่องคอมมิชชั่น, affiliate, หรือรายได้ เด็ดขาด
- เน้นรีวิว แนะนำ เชิญชวนให้ลองใช้สินค้า
- บอกข้อดี จุดเด่นของสินค้า
- มี Call-to-Action เช่น "กดตะกร้าเลย!"
- ราคาให้แสดงเป็นจำนวนเต็ม ไม่ต้องมีจุดทศนิยม
- ความยาวไม่เกิน 200 ตัวอักษร (ไม่รวมลิงก์)
- ตอบแค่ caption เท่านั้น ไม่ต้องมีเครื่องหมายคำพูด
- ห้ามใส่ลิงก์ใน caption (จะเพิ่มทีหลัง)`;

  const userPrompt = `สร้าง caption รีวิวสินค้านี้:
สินค้าหลัก: ${mainProduct.name} ราคา ${priceStr}
${otherProducts.length > 0 ? `สินค้าอื่นๆ: ${otherProducts.map((p) => p.name).join(", ")}` : ""}

เน้นแนะนำสินค้าหลัก บอกจุดเด่น เชิญชวนให้ลองใช้`;

  let caption = await chatCompletion(systemPrompt, userPrompt);

  // Append Shopee link as copyable text at the end
  if (mainProduct.shopeeUrl) {
    caption = `${caption.trimEnd()}\n\n🛒 สั่งซื้อได้ที่: ${mainProduct.shopeeUrl}`;
  }

  return caption;
}
