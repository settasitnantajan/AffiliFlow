import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getErrorMessage } from "@/lib/utils";

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

    // Insert into product_queue
    const { data, error } = await supabase
      .from("product_queue")
      .insert({
        shopee_url: shopeeUrl,
        image_url: imageUrl,
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
