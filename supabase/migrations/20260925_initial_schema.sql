-- DHRUV Polar Knowledge & Outreach Platform Migration Schema
-- SIH26063 - Ministry of Earth Sciences / NCPOR

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Enums
CREATE TYPE user_role AS ENUM ('super_admin', 'scientist', 'outreach_officer', 'reviewer', 'public');
CREATE TYPE polar_region AS ENUM ('antarctic', 'arctic', 'himalaya', 'southern_ocean');
CREATE TYPE station_status AS ENUM ('active', 'seasonal', 'decommissioned', 'historic');
CREATE TYPE asset_type AS ENUM ('report', 'publication', 'dataset', 'photo', 'video', 'event', 'news');
CREATE TYPE access_level AS ENUM ('public', 'restricted');
CREATE TYPE asset_status AS ENUM ('draft', 'processing', 'ready', 'published', 'archived');
CREATE TYPE social_channel AS ENUM ('x', 'instagram', 'linkedin', 'facebook', 'blog', 'press_release', 'newsletter');
CREATE TYPE post_status AS ENUM ('draft', 'in_review', 'approved', 'scheduled', 'published', 'rejected');
CREATE TYPE grade_band AS ENUM ('6-8', '9-10', '11-12');
CREATE TYPE ai_job_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'public',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expeditions Table
CREATE TABLE IF NOT EXISTS expeditions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    region polar_region NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    leader TEXT NOT NULL,
    summary TEXT NOT NULL,
    route_geojson JSONB,
    cover_image TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stations Table
CREATE TABLE IF NOT EXISTS stations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    region polar_region NOT NULL,
    lat NUMERIC(9,6) NOT NULL,
    lng NUMERIC(9,6) NOT NULL,
    established_year INT NOT NULL,
    status station_status NOT NULL DEFAULT 'active',
    description TEXT NOT NULL,
    image TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assets Table
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type asset_type NOT NULL,
    title TEXT NOT NULL,
    title_hi TEXT,
    description TEXT NOT NULL,
    file_path TEXT,            -- nullable: 'event' and 'news' assets may have no file
    mime_type TEXT,
    file_size BIGINT,
    thumbnail TEXT,
    expedition_id UUID REFERENCES expeditions(id) ON DELETE SET NULL,
    station_id UUID REFERENCES stations(id) ON DELETE SET NULL,
    region polar_region NOT NULL,
    discipline TEXT[] NOT NULL DEFAULT '{}',
    year INT NOT NULL,
    authors TEXT[] NOT NULL DEFAULT '{}',
    doi TEXT,
    license TEXT DEFAULT 'CC-BY-4.0',
    access_level access_level NOT NULL DEFAULT 'public',
    status asset_status NOT NULL DEFAULT 'draft',
    ai_summary TEXT,
    ai_summary_simple TEXT,
    ai_summary_hi TEXT,
    ai_keywords TEXT[] DEFAULT '{}',
    ai_caption TEXT,
    alt_text TEXT,
    ai_metadata JSONB NOT NULL DEFAULT '{}', -- key findings, dataset variables, image location guess, etc.
    search_tsv TSVECTOR,
    view_count INT DEFAULT 0,
    download_count INT DEFAULT 0,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

-- Asset Chunks (for Vector RAG Search)
CREATE TABLE IF NOT EXISTS asset_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    content_tsv TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
    embedding VECTOR(1024)
);

-- HNSW (not ivfflat): ivfflat built on an empty table gives bad recall on small demo data
CREATE INDEX IF NOT EXISTS asset_chunks_embedding_idx ON asset_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS asset_chunks_tsv_idx ON asset_chunks USING GIN(content_tsv);

-- Content Studio Posts
CREATE TABLE IF NOT EXISTS content_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    channel social_channel NOT NULL,
    language VARCHAR(5) NOT NULL DEFAULT 'en',
    body TEXT NOT NULL,
    hashtags TEXT[] DEFAULT '{}',
    image_url TEXT,
    status post_status NOT NULL DEFAULT 'draft',
    scheduled_at TIMESTAMPTZ,
    reviewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    review_note TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Smart Education Lessons
CREATE TABLE IF NOT EXISTS lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    grade_band grade_band NOT NULL,
    language VARCHAR(5) NOT NULL DEFAULT 'en',
    content_md TEXT NOT NULL,
    learning_objectives TEXT[] DEFAULT '{}',
    status asset_status NOT NULL DEFAULT 'published',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Educational Quizzes
CREATE TABLE IF NOT EXISTS quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    questions JSONB NOT NULL
);

-- Quiz Attempts & Certificates
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    school TEXT NOT NULL,
    score INT NOT NULL,
    certificate_id TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat Logs (Ask Dhruv RAG)
CREATE TABLE IF NOT EXISTS chat_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    cited_asset_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics Events
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event TEXT NOT NULL,
    asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
    meta JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Jobs Tracker
CREATE TABLE IF NOT EXISTS ai_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    job_type TEXT NOT NULL,
    status ai_job_status NOT NULL DEFAULT 'pending',
    error TEXT,
    tokens_in INT DEFAULT 0,
    tokens_out INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    finished_at TIMESTAMPTZ
);

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id UUID NOT NULL,
    diff JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Full-Text Search TSVECTOR trigger
CREATE OR REPLACE FUNCTION update_asset_tsvector() RETURNS TRIGGER AS $$
BEGIN
    NEW.search_tsv := 
        setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
        setweight(to_tsvector('simple',  coalesce(NEW.title_hi, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.ai_summary, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(NEW.description, '')), 'C') ||
        setweight(to_tsvector('english', coalesce(array_to_string(NEW.ai_keywords, ' '), '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tsvector_update_assets ON assets;
CREATE TRIGGER tsvector_update_assets
    BEFORE INSERT OR UPDATE ON assets
    FOR EACH ROW EXECUTE FUNCTION update_asset_tsvector();

CREATE INDEX IF NOT EXISTS assets_search_tsv_idx ON assets USING GIN(search_tsv);

-- ============================================================
-- AUTH HELPERS
-- ============================================================
-- Role of the current user. SECURITY DEFINER avoids RLS recursion on profiles.
CREATE OR REPLACE FUNCTION public.app_role() RETURNS user_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT COALESCE((SELECT role FROM profiles WHERE id = auth.uid()), 'public'::user_role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff() RETURNS boolean
LANGUAGE sql STABLE AS $$ SELECT public.app_role() <> 'public' $$;

-- Every new auth user gets a profile with role 'public'.
-- Roles are ONLY raised by a super_admin (or scripts/seed.ts via service role).
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO profiles (id, full_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY — enabled on EVERY table.
-- Server-only writes (chunks, ai_jobs, analytics, chat_logs, quiz_attempts, audit_log)
-- go through the service-role client, which bypasses RLS.
-- ============================================================
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE expeditions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets            ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_chunks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_posts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons           ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_jobs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log         ENABLE ROW LEVEL SECURITY;

-- profiles: self or staff can read; only super_admin can change roles
CREATE POLICY profiles_read  ON profiles FOR SELECT USING (id = auth.uid() OR is_staff());
CREATE POLICY profiles_admin ON profiles FOR UPDATE USING (app_role() = 'super_admin')
                                                   WITH CHECK (app_role() = 'super_admin');

-- stations / expeditions: public read, scientist + admin write
CREATE POLICY stations_read     ON stations    FOR SELECT USING (true);
CREATE POLICY stations_write    ON stations    FOR ALL USING (app_role() IN ('super_admin','scientist'))
                                                      WITH CHECK (app_role() IN ('super_admin','scientist'));
CREATE POLICY expeditions_read  ON expeditions FOR SELECT USING (true);
CREATE POLICY expeditions_write ON expeditions FOR ALL USING (app_role() IN ('super_admin','scientist'))
                                                      WITH CHECK (app_role() IN ('super_admin','scientist'));

-- assets: public sees only published+public; staff see everything
CREATE POLICY assets_public_read ON assets FOR SELECT USING (status = 'published' AND access_level = 'public');
CREATE POLICY assets_staff_read  ON assets FOR SELECT USING (is_staff());
CREATE POLICY assets_insert      ON assets FOR INSERT WITH CHECK (app_role() IN ('super_admin','scientist'));
CREATE POLICY assets_update      ON assets FOR UPDATE USING (app_role() IN ('super_admin','scientist','reviewer'))
                                                     WITH CHECK (app_role() IN ('super_admin','scientist','reviewer'));
CREATE POLICY assets_delete      ON assets FOR DELETE USING (app_role() = 'super_admin');

-- asset_chunks: visible only if the parent asset is visible to the caller
-- (assets RLS applies inside the subquery) — stops Ask Dhruv leaking restricted documents.
CREATE POLICY chunks_read ON asset_chunks FOR SELECT
    USING (EXISTS (SELECT 1 FROM assets a WHERE a.id = asset_chunks.asset_id));

-- content_posts: public sees published; outreach/reviewer/admin manage.
-- "Reviewer must differ from creator" is enforced in the approve Server Action.
CREATE POLICY posts_public_read ON content_posts FOR SELECT USING (status = 'published');
CREATE POLICY posts_staff       ON content_posts FOR ALL
    USING (app_role() IN ('super_admin','outreach_officer','reviewer'))
    WITH CHECK (app_role() IN ('super_admin','outreach_officer','reviewer'));

-- lessons: public sees published; staff manage
CREATE POLICY lessons_public_read ON lessons FOR SELECT USING (status = 'published');
CREATE POLICY lessons_staff       ON lessons FOR ALL USING (is_staff()) WITH CHECK (is_staff());

-- quizzes: NO public read (questions JSON contains answer_index); served answer-less by a server route
CREATE POLICY quizzes_staff ON quizzes FOR ALL USING (is_staff()) WITH CHECK (is_staff());

-- Staff-only read for logs; all inserts via service role on the server
CREATE POLICY attempts_staff_read  ON quiz_attempts    FOR SELECT USING (is_staff());
CREATE POLICY chat_staff_read      ON chat_logs        FOR SELECT USING (is_staff());
CREATE POLICY analytics_staff_read ON analytics_events FOR SELECT USING (is_staff());
CREATE POLICY jobs_staff_read      ON ai_jobs          FOR SELECT USING (is_staff());
CREATE POLICY audit_admin_read     ON audit_log        FOR SELECT USING (app_role() = 'super_admin');

-- ============================================================
-- HYBRID SEARCH RPC (full-text + vector, Reciprocal Rank Fusion)
-- SECURITY INVOKER (default) so RLS applies. Ask Dhruv MUST call this with the
-- anon/user client — never the service-role client — or restricted content leaks.
-- ============================================================
CREATE OR REPLACE FUNCTION public.hybrid_search(
    query_text TEXT,
    query_embedding VECTOR(1024),
    match_count INT DEFAULT 8,
    full_text_weight FLOAT DEFAULT 1,
    semantic_weight FLOAT DEFAULT 1,
    rrf_k INT DEFAULT 50
) RETURNS TABLE (chunk_id UUID, asset_id UUID, content TEXT, score FLOAT)
LANGUAGE sql STABLE AS $$
WITH full_text AS (
    SELECT c.id,
           row_number() OVER (ORDER BY ts_rank_cd(c.content_tsv, websearch_to_tsquery('english', query_text)) DESC) AS rank_ix
    FROM asset_chunks c
    WHERE c.content_tsv @@ websearch_to_tsquery('english', query_text)
    ORDER BY rank_ix
    LIMIT match_count * 2
),
semantic AS (
    SELECT c.id,
           row_number() OVER (ORDER BY c.embedding <=> query_embedding) AS rank_ix
    FROM asset_chunks c
    WHERE c.embedding IS NOT NULL
    ORDER BY rank_ix
    LIMIT match_count * 2
)
SELECT c.id, c.asset_id, c.content,
       COALESCE(1.0 / (rrf_k + ft.rank_ix), 0.0) * full_text_weight +
       COALESCE(1.0 / (rrf_k + s.rank_ix),  0.0) * semantic_weight AS score
FROM full_text ft
FULL OUTER JOIN semantic s ON ft.id = s.id
JOIN asset_chunks c ON c.id = COALESCE(ft.id, s.id)
ORDER BY score DESC
LIMIT match_count;
$$;

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES
    ('public-media', 'public-media', true),
    ('archive', 'archive', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY archive_staff_upload ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'archive' AND public.app_role() IN ('super_admin','scientist'));
CREATE POLICY archive_staff_read ON storage.objects FOR SELECT
    USING (bucket_id = 'archive' AND public.is_staff());
