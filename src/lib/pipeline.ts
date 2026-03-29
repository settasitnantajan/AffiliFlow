import { createServerSupabase } from "./supabase-server";
import { analyzeProductImage } from "./ai/vision";
import { searchAndDownloadMultipleYouTube } from "./video/youtube-download";
import { generateCaptionAndHashtags } from "./ai/caption";

import { parsePrice, getErrorMessage } from "./utils";

// Helper: run with timeout (clears timer on success to prevent leak)
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
    }),
  ]);
}

export async function runPipeline(queueItemId?: string) {
  const supabase = createServerSupabase();

  // Create pipeline run with progress
  const { data: pipelineRun, error: runError } = await supabase
    .from("pipeline_runs")
    .insert({ status: "running", step_current: "queue", progress: 0 })
    .select()
    .single();

  if (runError || !pipelineRun)
    throw new Error(`Pipeline init failed: ${runError?.message}`);
  const runId = pipelineRun.id;

  let queueItem: { id: string; product_name?: string; price?: string; commission_rate?: string; image_url?: string; shopee_url: string } | null = null;

  try {
    // Helper to update progress
    const updateProgress = async (step: string, progress: number) => {
      await supabase
        .from("pipeline_runs")
        .update({ step_current: step, progress })
        .eq("id", runId);
    };

    // ========== Step 1: Pick from queue (FIFO or specific item) — 10% ==========
    await updateProgress("queue", 10);

    let queueQuery = supabase.from("product_queue").select("*");
    if (queueItemId) {
      queueQuery = queueQuery.eq("id", queueItemId);
    } else {
      queueQuery = queueQuery.eq("status", "queued").order("created_at", { ascending: true });
    }
    const { data: queueData, error: queueError } = await queueQuery.limit(1).single();

    if (queueError || !queueData) {
      throw new Error("ไม่มีสินค้าในคิว — ไปหน้า Upload เพื่อเพิ่มสินค้า");
    }
    queueItem = queueData;
    const item = queueItem!;

    // Mark as processing
    await supabase
      .from("product_queue")
      .update({ status: "processing" })
      .eq("id", item.id);

    // ========== Step 2: Groq Vision — read screenshot — 20% ==========
    await updateProgress("vision", 20);

    let productName = item.product_name ?? "สินค้า Shopee";
    let price = item.price ?? "";
    let commissionRate = item.commission_rate ?? "";

    // Skip vision if data was already analyzed at upload time
    if (!item.product_name && item.image_url) {
      const visionResult = await analyzeProductImage(item.image_url);
      productName = visionResult.product_name;
      price = visionResult.price;
      commissionRate = visionResult.commission_rate;

      // Save vision results back to queue
      await supabase
        .from("product_queue")
        .update({
          product_name: productName,
          price,
          commission_rate: commissionRate,
        })
        .eq("id", item.id);
    }

    // Parse numeric values once
    const numericPrice = parsePrice(price);
    const numericCommission = parsePrice(commissionRate);

    // Also save to products table
    const { data: savedProduct } = await supabase
      .from("products")
      .insert({
        pipeline_run_id: runId,
        name: productName,
        price: numericPrice,
        commission_rate: numericCommission,
        product_url: item.shopee_url,
        rank: 1,
        selected: true,
      })
      .select()
      .single();

    await supabase
      .from("pipeline_runs")
      .update({ products_found: 1 })
      .eq("id", runId);

    // ========== Step 3: YouTube videos x3 (with timeout) — 40% ==========
    await updateProgress("video", 40);

    let videoUrls: string[] = [];
    try {
      videoUrls = await withTimeout(searchAndDownloadMultipleYouTube(productName, 5), 420000);
    } catch (e) {
      console.warn("YouTube download failed:", e instanceof Error ? e.message : e);
    }

    const primaryVideoUrl = videoUrls[0] ?? null;

    // Save video sources
    for (const vUrl of videoUrls) {
      await supabase.from("video_sources").insert({
        pipeline_run_id: runId,
        product_id: savedProduct?.id ?? null,
        source_url: vUrl,
        source_type: "youtube",
        status: "downloaded",
      });
    }

    // Save production record (primary)
    const { data: savedProd } = await supabase
      .from("video_productions")
      .insert({
        pipeline_run_id: runId,
        output_url: primaryVideoUrl,
        duration: 30,
        status: primaryVideoUrl ? "done" : "failed",
        error_log: primaryVideoUrl ? null : "No YouTube video found",
      })
      .select()
      .single();

    const productionId = savedProd?.id ?? null;

    // ========== Step 4: AI Caption + Hashtag x3 (unique) — 70% ==========
    await updateProgress("caption", 70);

    const productInfo = [{
      name: productName,
      price: numericPrice,
      shopeeUrl: item.shopee_url,
    }];

    // Generate 5 unique captions
    const captionResults: { caption: string; hashtags: string[] }[] = [];
    for (let i = 0; i < 5; i++) {
      const result = await generateCaptionAndHashtags(productInfo);
      // Retry once if duplicate caption
      if (captionResults.some((c) => c.caption === result.caption)) {
        const retry = await generateCaptionAndHashtags(productInfo);
        captionResults.push(retry);
      } else {
        captionResults.push(result);
      }
    }

    // Save first caption to captions table
    await supabase.from("captions").insert({
      pipeline_run_id: runId,
      production_id: productionId,
      caption_text: captionResults[0].caption,
      hashtags: captionResults[0].hashtags,
      ai_model: "llama-3.3-70b",
    });

    // ========== Step 5: Save Final Result — 90% ==========
    await updateProgress("saving", 90);

    const productLinks = [
      {
        rank: 1,
        name: productName,
        url: item.shopee_url,
        price,
        commission_rate: commissionRate,
      },
    ];

    // Build videos array: pair each video with a caption
    const videosJson = videoUrls.map((vUrl, i) => ({
      video_url: vUrl,
      caption_text: captionResults[i]?.caption ?? captionResults[0].caption,
      hashtags: captionResults[i]?.hashtags ?? captionResults[0].hashtags,
    }));

    await supabase.from("video_results").insert({
      pipeline_run_id: runId,
      production_id: productionId,
      video_url: primaryVideoUrl,
      caption_text: captionResults[0].caption,
      hashtags: captionResults[0].hashtags,
      product_links: productLinks,
      videos: videosJson,
      status: "ready",
    });

    // Mark queue item as done
    await supabase
      .from("product_queue")
      .update({
        status: "done",
        processed_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    // Mark pipeline as success — 100%
    await supabase
      .from("pipeline_runs")
      .update({
        status: "success",
        step_current: "done",
        progress: 100,
        videos_produced: videoUrls.length,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);

    return {
      success: true,
      runId,
      productName,
      price,
      commissionRate,
      videoUrl: primaryVideoUrl,
      videosCount: videoUrls.length,
      captionPreview: captionResults[0].caption.slice(0, 100),
      hashtagCount: captionResults[0].hashtags.length,
    };
  } catch (e) {
    const errorMsg = getErrorMessage(e);

    // Mark only this queue item as failed (not all processing items)
    if (queueItem?.id) {
      await supabase
        .from("product_queue")
        .update({ status: "failed" })
        .eq("id", queueItem.id);
    }

    await supabase
      .from("pipeline_runs")
      .update({
        status: "failed",
        error_log: errorMsg,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);

    return { success: false, runId, error: errorMsg };
  }
}
