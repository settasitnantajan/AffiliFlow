-- Add AI-generated video URL to video_results (alongside existing YouTube video_url)
ALTER TABLE video_results ADD COLUMN IF NOT EXISTS ai_video_url TEXT;
