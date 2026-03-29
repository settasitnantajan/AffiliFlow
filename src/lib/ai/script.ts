import { chatCompletion } from "./groq";

interface ScriptInput {
  productName: string;
  price: string;
  commissionRate: string;
  category?: string;
}

/**
 * Generate a 15-second Thai product review script for Shopee Video.
 * ~40-50 Thai words = ~15 seconds when spoken by edge-tts.
 */
export async function generateReviewScript(input: ScriptInput): Promise<string> {
  const systemPrompt = `คุณเป็นนักรีวิวสินค้าออนไลน์ชื่อดังในไทย
สร้างสคริปต์สำหรับวีดีโอรีวิวสินค้า Shopee Video ความยาว 15 วินาที

กฎสำคัญ:
- เขียนเป็นภาษาไทยทั้งหมด ใช้ภาษาพูดธรรมชาติ (ไม่เป็นทางการเกินไป)
- ความยาว 40-50 คำไทย (ประมาณ 15 วินาทีเมื่อพูด)
- ห้ามพูดเรื่องคอมมิชชั่น, affiliate, หรือรายได้ เด็ดขาด
- ห้ามใส่อิโมจิ หรือสัญลักษณ์พิเศษ (จะใช้กับ TTS)
- ห้ามใส่ stage direction เช่น [พูด], (ยิ้ม)
- โครงสร้าง: ทักทาย → แนะนำสินค้า → จุดเด่น → ราคา → CTA
- ต้องมี Call-to-Action เช่น "กดตะกร้าเลย" หรือ "ลองดูได้เลย"
- ตอบแค่สคริปต์เท่านั้น ไม่ต้องมีคำอธิบายหรือเครื่องหมายคำพูด`;

  const categoryHint = input.category ? `\nหมวดหมู่สินค้า: ${input.category}` : "";

  const userPrompt = `สร้างสคริปต์รีวิวสินค้านี้:
สินค้า: ${input.productName}
ราคา: ${input.price}${categoryHint}

เน้นจุดเด่นตามประเภทสินค้า บอกราคา และเชิญชวนให้สั่งซื้อ`;

  const script = await chatCompletion(systemPrompt, userPrompt);

  // Clean up: remove quotes, emojis, stage directions
  return script
    .replace(/^["'""]/g, "")
    .replace(/["'""]\s*$/g, "")
    .replace(/\[.*?\]/g, "")
    .replace(/\(.*?\)/g, "")
    .replace(/[\u{1F600}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1FA00}-\u{1FAFF}]/gu, "")
    .trim();
}

/**
 * Use Groq to classify the product category.
 */
export async function classifyProductCategory(productName: string): Promise<string> {
  const systemPrompt = `จำแนกประเภทสินค้าจากชื่อ ตอบแค่ 1 คำเท่านั้น เช่น:
มือถือ, แท็บเล็ต, หูฟัง, ลำโพง, กล้อง, คอมพิวเตอร์,
เครื่องสำอาง, ครีม, เซรั่ม, สกินแคร์,
อาหารเสริม, วิตามิน,
เสื้อผ้า, รองเท้า, กระเป๋า,
อาหาร, ขนม, เครื่องดื่ม,
ของใช้ในบ้าน, เครื่องครัว, เฟอร์นิเจอร์,
ของเล่น, อุปกรณ์กีฬา,
อื่นๆ

ตอบแค่ 1 คำภาษาไทย`;

  const category = await chatCompletion(systemPrompt, productName);
  return category.trim();
}
