import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getErrorMessage } from "@/lib/utils";
import { analyzeProductImage } from "@/lib/ai/vision";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const shopeeUrl = formData.get("shopee_url") as string;
    const image = formData.get("image") as File | null;

    if (!shopeeUrl) {
      return NextResponse.json(
        { error: "shopee_url is required" },
        { status: 400 }
      );
    }

    // Validate URL to prevent XSS via javascript: or data: URIs
    try {
      const parsed = new URL(shopeeUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return NextResponse.json(
          { error: "Invalid URL protocol" },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabase();
    let imageUrl: string | null = null;

    // Upload image to Supabase Storage if provided
    if (image && image.size > 0) {
      const ext = image.name.split(".").pop() ?? "png";
      const fileName = `screenshot_${Date.now()}.${ext}`;
      const buffer = Buffer.from(await image.arrayBuffer());

      const { error: uploadError } = await supabase.storage
        .from("videos")
        .upload(`screenshots/${fileName}`, buffer, {
          contentType: image.type,
          upsert: false,
        });

      if (!uploadError) {
        const { data: publicUrl } = supabase.storage
          .from("videos")
          .getPublicUrl(`screenshots/${fileName}`);
        imageUrl = publicUrl.publicUrl;
      }
    }

    // Require image for AI analysis
    if (!imageUrl) {
      return NextResponse.json(
        { error: "ต้องมีภาพ screenshot เพื่อให้ AI วิเคราะห์ข้อมูลสินค้า" },
        { status: 400 }
      );
    }

    // AI analyze before inserting into queue
    let visionResult;
    try {
      visionResult = await analyzeProductImage(imageUrl);
    } catch (e) {
      return NextResponse.json(
        { error: `AI วิเคราะห์ข้อมูลไม่สำเร็จ: ${getErrorMessage(e)} — กรุณาอัพโหลดภาพใหม่` },
        { status: 422 }
      );
    }

    // Validate: all fields must have real values
    const unknown = ["ไม่ทราบ", ""];
    if (
      unknown.includes(visionResult.product_name) ||
      visionResult.product_name === "สินค้า Shopee" ||
      unknown.includes(visionResult.price) ||
      unknown.includes(visionResult.commission_rate)
    ) {
      return NextResponse.json(
        { error: "AI วิเคราะห์ข้อมูลไม่สำเร็จ — ภาพไม่ชัดหรืออ่านไม่ได้ กรุณาอัพโหลดภาพใหม่" },
        { status: 422 }
      );
    }

    // Insert into product_queue with analyzed data
    const { data, error } = await supabase
      .from("product_queue")
      .insert({
        shopee_url: shopeeUrl,
        image_url: imageUrl,
        product_name: visionResult.product_name,
        price: visionResult.price,
        commission_rate: visionResult.commission_rate,
        status: "queued",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (e) {
    return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 });
  }
}
