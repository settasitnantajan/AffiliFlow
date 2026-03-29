-- Add multi-video support: store 3 videos + captions per pipeline run
-- videos column: [{video_url, caption_text, hashtags}, ...]
ALTER TABLE video_results ADD COLUMN IF NOT EXISTS videos JSONB DEFAULT '[]'::jsonb;
