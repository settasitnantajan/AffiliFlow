-- Pipeline runs log
CREATE TABLE pipeline_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT DEFAULT 'running',
  step_current TEXT,
  trends_found INT DEFAULT 0,
  products_found INT DEFAULT 0,
  videos_produced INT DEFAULT 0,
  error_log TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Step 1: Trend searches
CREATE TABLE trend_searches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_run_id UUID REFERENCES pipeline_runs(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  source TEXT,
  trending_score INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Products with commission
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_run_id UUID REFERENCES pipeline_runs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  product_url TEXT,
  image_url TEXT,
  price DECIMAL,
  commission_rate DECIMAL,
  shopee_commission DECIMAL,
  seller_commission DECIMAL,
  sales_count INT,
  category TEXT,
  rank INT,
  selected BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Video sources
CREATE TABLE video_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_run_id UUID REFERENCES pipeline_runs(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  source_url TEXT,
  source_type TEXT,
  status TEXT DEFAULT 'found',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: Video productions
CREATE TABLE video_productions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_run_id UUID REFERENCES pipeline_runs(id) ON DELETE CASCADE,
  source_id UUID REFERENCES video_sources(id) ON DELETE CASCADE,
  output_url TEXT,
  thumbnail_url TEXT,
  duration INT DEFAULT 30,
  status TEXT DEFAULT 'pending',
  error_log TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 5: Captions + hashtags
CREATE TABLE captions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_run_id UUID REFERENCES pipeline_runs(id) ON DELETE CASCADE,
  production_id UUID REFERENCES video_productions(id) ON DELETE CASCADE,
  caption_text TEXT,
  hashtags TEXT[],
  ai_model TEXT DEFAULT 'llama-3.3-70b',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 6: Final results (video + caption + 5 product links)
CREATE TABLE video_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_run_id UUID REFERENCES pipeline_runs(id) ON DELETE CASCADE,
  production_id UUID REFERENCES video_productions(id) ON DELETE CASCADE,
  caption_id UUID REFERENCES captions(id) ON DELETE CASCADE,
  video_url TEXT,
  thumbnail_url TEXT,
  caption_text TEXT,
  hashtags TEXT[],
  product_links JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'ready',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Storage bucket for videos (run via Supabase dashboard)
-- CREATE POLICY on storage.objects for public read access
