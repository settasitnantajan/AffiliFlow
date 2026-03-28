-- Enable RLS but allow all operations via anon key (server-side only)
-- Keys are never exposed to browser so this is safe

ALTER TABLE pipeline_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_productions ENABLE ROW LEVEL SECURITY;
ALTER TABLE captions ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_results ENABLE ROW LEVEL SECURITY;

-- Allow all operations for anon role (our server-side API)
CREATE POLICY "Allow all for anon" ON pipeline_runs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON trend_searches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON video_sources FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON video_productions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON captions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON video_results FOR ALL USING (true) WITH CHECK (true);
