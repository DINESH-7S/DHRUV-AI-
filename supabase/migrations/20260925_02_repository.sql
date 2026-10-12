-- DHRUV — repository helpers (run after 20260925_initial_schema.sql). Safe to re-run.

-- AI extras (key findings, dataset variables, image location guess...). Also in the initial
-- migration for fresh projects; IF NOT EXISTS covers databases created before it was added.
ALTER TABLE assets ADD COLUMN IF NOT EXISTS ai_metadata JSONB NOT NULL DEFAULT '{}';

-- ============================================================
-- View / download counters. Called by the server with the service role only.
-- ============================================================
CREATE OR REPLACE FUNCTION public.increment_asset_counter(p_asset_id UUID, p_kind TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF p_kind = 'view' THEN
        UPDATE assets SET view_count = view_count + 1 WHERE id = p_asset_id;
    ELSIF p_kind = 'download' THEN
        UPDATE assets SET download_count = download_count + 1 WHERE id = p_asset_id;
    ELSE
        RAISE EXCEPTION 'Unknown counter kind: %', p_kind;
    END IF;
END $$;

REVOKE ALL ON FUNCTION public.increment_asset_counter(UUID, TEXT) FROM PUBLIC, anon, authenticated;

-- ============================================================
-- Related assets by embedding similarity.
-- Centroid of the asset's chunk embeddings → nearest chunks of other assets → best score per asset.
-- SECURITY INVOKER (default): RLS on asset_chunks applies, so the public only ever gets
-- published, public assets back.
-- ============================================================
CREATE OR REPLACE FUNCTION public.related_assets(p_asset_id UUID, match_count INT DEFAULT 4)
RETURNS TABLE (related_id UUID, similarity FLOAT)
LANGUAGE sql STABLE AS $$
WITH target AS (
    SELECT AVG(c.embedding) AS centroid
    FROM asset_chunks c
    WHERE c.asset_id = p_asset_id AND c.embedding IS NOT NULL
),
nearest AS (
    SELECT c.asset_id, 1 - (c.embedding <=> t.centroid) AS similarity
    FROM asset_chunks c
    CROSS JOIN target t
    WHERE t.centroid IS NOT NULL
      AND c.asset_id <> p_asset_id
      AND c.embedding IS NOT NULL
    ORDER BY c.embedding <=> t.centroid
    LIMIT match_count * 10
)
SELECT n.asset_id AS related_id, MAX(n.similarity) AS similarity
FROM nearest n
GROUP BY n.asset_id
ORDER BY similarity DESC
LIMIT match_count;
$$;
