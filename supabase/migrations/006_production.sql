-- Production: selected videos ready to post
CREATE TABLE IF NOT EXISTS production_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_result_id UUID REFERENCES video_results(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  caption_text TEXT,
  hashtags TEXT[],
  product_links JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'ready', -- ready, posted
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE production_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON production_items FOR ALL USING (true) WITH CHECK (true);
