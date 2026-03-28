import { createServerSupabase } from "./supabase-server";
import { findTrends } from "./scraper/trend-finder";
import { searchShopeeProducts } from "./scraper/shopee-products";
import { findVideoSource } from "./scraper/video-finder";
import { downloadVideo } from "./video/downloader";
import { editVideo } from "./video/editor";
import { getStockVideo } from "./video/stock";
import { getAndUploadStockVideo } from "./video/stock-upload";
import { generateCaption } from "./ai/caption";
import { generateHashtags } from "./ai/hashtag";
import * as fs from "fs";

export async function runPipeline() {
  const supabase = createServerSupabase();

  // Create pipeline run
  const { data: pipelineRun, error: runError } = await supabase
    .from("pipeline_runs")
    .insert({ status: "running", step_current: "trend" })
    .select()
    .single();

  if (runError || !pipelineRun) throw new Error(`Pipeline init failed: ${runError?.message}`);
  const runId = pipelineRun.id;

  try {
    // ========== Step 1: Trend Research ==========
    await supabase.from("pipeline_runs").update({ step_current: "trend" }).eq("id", runId);

    const trends = await findTrends();

    // Save trends
    if (trends.length > 0) {
      await supabase.from("trend_searches").insert(
        trends.map((t) => ({ ...t, pipeline_run_id: runId }))
      );
    }

    await supabase
      .from("pipeline_runs")
      .update({ trends_found: trends.length })
      .eq("id", runId);

    // Pick top keyword
    const topKeyword = trends[0]?.keyword ?? "สินค้ายอดนิยม";

    // ========== Step 2: Product Analysis ==========
    await supabase.from("pipeline_runs").update({ step_current: "product" }).eq("id", runId);

    const products = await searchShopeeProducts(topKeyword);

    // Save products with rank
    const productsToInsert = products.map((p, i) => ({
      ...p,
      pipeline_run_id: runId,
      rank: i + 1,
      selected: i === 0, // first product is the main one
    }));

    const { data: savedProducts } = await supabase
      .from("products")
      .insert(productsToInsert)
      .select();

    await supabase
      .from("pipeline_runs")
      .update({ products_found: products.length })
      .eq("id", runId);

    const mainProduct = savedProducts?.[0];
    if (!mainProduct) throw new Error("No products found");

    // ========== Step 3: Find Video Source ==========
    await supabase.from("pipeline_runs").update({ step_current: "source" }).eq("id", runId);

    const videoSource = await findVideoSource(topKeyword);

    let sourceId: string | null = null;
    if (videoSource) {
      const { data: savedSource } = await supabase
        .from("video_sources")
        .insert({
          pipeline_run_id: runId,
          product_id: mainProduct.id,
          source_url: videoSource.source_url,
          source_type: videoSource.source_type,
          status: "found",
        })
        .select()
        .single();
      sourceId = savedSource?.id ?? null;
    }

    // ========== Step 4: Video Production ==========
    await supabase.from("pipeline_runs").update({ step_current: "production" }).eq("id", runId);

    let editedFilePath: string | null = null;
    let productionId: string | null = null;

    if (videoSource) {
      // Download
      const downloaded = await downloadVideo(
        videoSource.source_url,
        videoSource.source_type
      );

      if (downloaded) {
        // Update source status
        if (sourceId) {
          await supabase
            .from("video_sources")
            .update({ status: "downloaded" })
            .eq("id", sourceId);
        }

        // Edit: cut to 30s + overlay
        const edited = await editVideo(
          downloaded.filePath,
          mainProduct.name,
          mainProduct.price
        );

        if (edited) {
          editedFilePath = edited.filePath;
        }

        // Clean up source file
        try { fs.unlinkSync(downloaded.filePath); } catch {}
      }
    }

    // Fallback: try stock video
    if (!editedFilePath) {
      const stockPath = await getStockVideo(topKeyword);
      if (stockPath) {
        const edited = await editVideo(
          stockPath,
          mainProduct.name,
          mainProduct.price
        );
        if (edited) editedFilePath = edited.filePath;
        try { fs.unlinkSync(stockPath); } catch {}
      }
    }

    // Upload to Supabase Storage
    let videoUrl = "";
    if (editedFilePath && fs.existsSync(editedFilePath)) {
      const fileName = `video_${Date.now()}.mp4`;
      const fileBuffer = fs.readFileSync(editedFilePath);

      const { error: uploadError } = await supabase.storage
        .from("videos")
        .upload(fileName, fileBuffer, {
          contentType: "video/mp4",
          upsert: false,
        });

      if (!uploadError) {
        const { data: publicUrl } = supabase.storage
          .from("videos")
          .getPublicUrl(fileName);
        videoUrl = publicUrl.publicUrl;
      }

      // Save production record
      const { data: savedProd } = await supabase
        .from("video_productions")
        .insert({
          pipeline_run_id: runId,
          source_id: sourceId,
          output_url: videoUrl,
          duration: 30,
          status: videoUrl ? "done" : "failed",
          error_log: uploadError?.message ?? null,
        })
        .select()
        .single();

      productionId = savedProd?.id ?? null;

      // Clean up
      try { fs.unlinkSync(editedFilePath); } catch {}
    }

    // Serverless fallback: Pexels stock video → Supabase Storage directly
    if (!videoUrl) {
      const stockUrl = await getAndUploadStockVideo(topKeyword);
      if (stockUrl) videoUrl = stockUrl;
    }

    // Save production record
    {
      const { data: savedProd } = await supabase
        .from("video_productions")
        .insert({
          pipeline_run_id: runId,
          source_id: sourceId,
          output_url: videoUrl || null,
          duration: 30,
          status: videoUrl ? "done" : "failed",
          error_log: videoUrl ? null : "No video source available",
        })
        .select()
        .single();
      productionId = savedProd?.id ?? null;
    }

    // ========== Step 5: AI Caption + Hashtag ==========
    await supabase.from("pipeline_runs").update({ step_current: "caption" }).eq("id", runId);

    const productInfos = (savedProducts ?? []).slice(0, 5).map((p) => ({
      name: p.name,
      price: p.price,
      commission_rate: p.commission_rate,
    }));

    const captionText = await generateCaption(productInfos);
    const hashtags = await generateHashtags(topKeyword, mainProduct.name);

    const { data: savedCaption } = await supabase
      .from("captions")
      .insert({
        pipeline_run_id: runId,
        production_id: productionId,
        caption_text: captionText,
        hashtags,
        ai_model: "llama-3.3-70b",
      })
      .select()
      .single();

    // ========== Step 6: Save Final Result ==========
    await supabase.from("pipeline_runs").update({ step_current: "done" }).eq("id", runId);

    const productLinks = (savedProducts ?? []).slice(0, 5).map((p) => ({
      rank: p.rank,
      name: p.name,
      url: p.product_url,
      price: p.price,
      commission_rate: p.commission_rate,
    }));

    await supabase.from("video_results").insert({
      pipeline_run_id: runId,
      production_id: productionId,
      caption_id: savedCaption?.id ?? null,
      video_url: videoUrl,
      caption_text: captionText,
      hashtags,
      product_links: productLinks,
      status: "ready",
    });

    // Mark pipeline as success
    await supabase
      .from("pipeline_runs")
      .update({
        status: "success",
        videos_produced: videoUrl ? 1 : 0,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);

    return {
      success: true,
      runId,
      keyword: topKeyword,
      trendsFound: trends.length,
      productsFound: products.length,
      videoUrl,
      captionPreview: captionText.slice(0, 100),
      hashtagCount: hashtags.length,
      productLinks: productLinks.length,
    };
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e);
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
