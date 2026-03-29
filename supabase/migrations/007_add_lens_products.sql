-- Add Google Lens product results to queue items
ALTER TABLE product_queue ADD COLUMN IF NOT EXISTS lens_products JSONB;
