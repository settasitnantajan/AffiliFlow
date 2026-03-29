import { groq } from "./groq";

interface VisionResult {
  product_name: string;
  price: string;
  commission_rate: string;
}

export async function analyzeProductImage(
  imageUrl: string
): Promise<VisionResult> {
  const response = await groq.chat.completions.create({
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `ดูรูป screenshot จาก Shopee Commission XTRA แล้วดึงข้อมูลสินค้า
ตอบเป็น JSON เท่านั้น ไม่ต้องมีคำอธิบาย:
{"product_name": "ชื่อสินค้าเต็มๆ ตามที่เห็นในรูป ห้ามตัดย่อ ห้ามสรุป", "price": "ราคา เช่น ฿199-฿599", "commission_rate": "เปอร์เซ็นต์ค่าคอม เช่น 10%"}

สำคัญ: product_name ต้องเป็นชื่อเต็มจากรูป ห้ามตัดคำ ห้ามย่อ ถ้ามีหลายรุ่นให้ใส่ทั้งหมด

ถ้าอ่านไม่ได้ให้ตอบ: {"product_name": "สินค้า Shopee", "price": "ไม่ทราบ", "commission_rate": "ไม่ทราบ"}`,
          },
          {
            type: "image_url",
            image_url: { url: imageUrl },
          },
        ],
      },
    ],
    temperature: 0.3,
    max_tokens: 512,
  });

  const text = response.choices[0]?.message?.content ?? "";

  try {
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as VisionResult;
    }
  } catch {
    // Fall through to default
  }

  return {
    product_name: "สินค้า Shopee",
    price: "ไม่ทราบ",
    commission_rate: "ไม่ทราบ",
  };
}
