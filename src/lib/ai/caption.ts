import { chatCompletion } from "./groq";

interface ProductInfo {
  name: string;
  price: number;
}

export async function generateCaption(
  products: ProductInfo[]
): Promise<string> {
  const mainProduct = products[0];
  const otherProducts = products.slice(1);

  const systemPrompt = `คุณเป็นนักรีวิวสินค้าออนไลน์ชื่อดังในประเทศไทย
สร้าง caption สำหรับวีดีโอ Shopee Video ที่ดึงดูดและเชิญชวนให้คนอยากลองใช้สินค้า
เขียนเป็นภาษาไทย ใช้อิโมจิอย่างเหมาะสม

กฎสำคัญ:
- ห้ามพูดเรื่องคอมมิชชั่น, affiliate, หรือรายได้ เด็ดขาด
- เน้นรีวิว แนะนำ เชิญชวนให้ลองใช้สินค้า
- บอกข้อดี จุดเด่นของสินค้า
- มี Call-to-Action เช่น "กดตะกร้าเลย!" "ลิงก์อยู่ด้านล่าง!"
- ความยาวไม่เกิน 200 ตัวอักษร
- ตอบแค่ caption เท่านั้น ไม่ต้องมีเครื่องหมายคำพูด`;

  const userPrompt = `สร้าง caption รีวิวสินค้านี้:
สินค้าหลัก: ${mainProduct.name} ราคา ฿${mainProduct.price.toLocaleString()}
${otherProducts.length > 0 ? `สินค้าอื่นๆ: ${otherProducts.map((p) => p.name).join(", ")}` : ""}

เน้นแนะนำสินค้าหลัก บอกจุดเด่น เชิญชวนให้ลองใช้`;

  return chatCompletion(systemPrompt, userPrompt);
}
