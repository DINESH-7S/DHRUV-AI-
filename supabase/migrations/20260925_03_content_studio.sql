-- DHRUV — Content Studio workflow (run after 20260925_02_repository.sql). Safe to re-run.

ALTER TABLE content_posts ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE content_posts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Review queue and /news both list posts by status, newest first.
CREATE INDEX IF NOT EXISTS content_posts_status_created_idx ON content_posts (status, created_at DESC);
CREATE INDEX IF NOT EXISTS content_posts_asset_idx ON content_posts (asset_id);
CREATE INDEX IF NOT EXISTS assets_status_created_idx ON assets (status, created_at DESC);
