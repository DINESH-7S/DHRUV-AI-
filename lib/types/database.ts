export type UserRole = 'super_admin' | 'scientist' | 'outreach_officer' | 'reviewer' | 'public';
export type PolarRegion = 'antarctic' | 'arctic' | 'himalaya' | 'southern_ocean';
export type StationStatus = 'active' | 'seasonal' | 'decommissioned' | 'historic';
export type AssetType = 'report' | 'publication' | 'dataset' | 'photo' | 'video' | 'event' | 'news';
export type AccessLevel = 'public' | 'restricted';
export type AssetStatus = 'draft' | 'processing' | 'ready' | 'published' | 'archived';
export type SocialChannel = 'x' | 'instagram' | 'linkedin' | 'facebook' | 'blog' | 'press_release' | 'newsletter';
export type PostStatus = 'draft' | 'in_review' | 'approved' | 'scheduled' | 'published' | 'rejected';
export type GradeBand = '6-8' | '9-10' | '11-12';
export type AIJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
}

export interface Expedition {
  id: string;
  name: string;
  name_hi?: string | null;
  summary_hi?: string | null;
  code: string;
  region: PolarRegion;
  start_date: string;
  end_date?: string;
  leader: string;
  summary: string;
  /** GeoJSON FeatureCollection of the schematic route; its `dhruv` member holds the sourced facts. */
  route_geojson?: ExpeditionGeo | null;
  /** Legacy free URL; do not use for new data (no credit). Prefer cover_asset_id. */
  cover_image?: string | null;
  /** Archive photo used as the cover, so its credit and licence travel with it (migration 05). */
  cover_asset_id?: string | null;
  created_at: string;
}

export interface ExpeditionStop {
  lat: number;
  lng: number;
  label: string;
  label_hi?: string | null;
}

export interface ExpeditionSource {
  name: string;
  url: string;
}

export interface ExpeditionMilestone {
  date: string;
  text: string;
  text_hi?: string | null;
  /** Index into the dossier's sources. */
  source?: number;
}

/**
 * Verified facts for an expedition page (content/expeditions.json, written by
 * `npm run import-expeditions`). Stored as a GeoJSON foreign member so no migration is needed.
 */
export interface ExpeditionDossier {
  /** How exact start_date is: 'day' (default), 'month', 'season', 'first_record' or 'reported'. */
  date_precision?: 'day' | 'month' | 'season' | 'first_record' | 'reported';
  station?: string | null;
  stops: ExpeditionStop[];
  sources: ExpeditionSource[];
  milestones: ExpeditionMilestone[];
}

export interface ExpeditionGeo {
  type: 'FeatureCollection';
  features: unknown[];
  dhruv?: ExpeditionDossier;
}

export interface Station {
  id: string;
  name: string;
  name_hi?: string | null;
  description_hi?: string | null;
  region: PolarRegion;
  lat: number;
  lng: number;
  established_year: number;
  status: StationStatus;
  description: string;
  image?: string | null;
  /** Archive photo used as the cover, so its credit and licence travel with it (migration 05). */
  cover_asset_id?: string | null;
  created_at: string;
}

export interface Asset {
  id: string;
  type: AssetType;
  title: string;
  title_hi?: string;
  description: string;
  file_path?: string | null;
  mime_type?: string | null;
  file_size?: number | null;
  thumbnail?: string;
  expedition_id?: string;
  station_id?: string;
  region: PolarRegion;
  discipline: string[];
  year: number;
  authors: string[];
  doi?: string;
  license?: string;
  access_level: AccessLevel;
  status: AssetStatus;
  ai_summary?: string;
  ai_summary_simple?: string;
  ai_summary_hi?: string;
  ai_keywords?: string[];
  ai_caption?: string;
  alt_text?: string;
  ai_metadata?: AssetAIMetadata;
  search_tsv?: string;
  view_count: number;
  download_count: number;
  created_by?: string;
  created_at: string;
  published_at?: string;
}

export interface DatasetVariable {
  name: string;
  description: string;
  unit: string;
}

/** Extra AI output stored in assets.ai_metadata (JSONB). Every field is optional. */
export interface AssetAIMetadata {
  model?: string;
  mock?: boolean;
  suggested_title?: string;
  key_findings?: string[];
  pages?: number;
  truncated?: boolean;
  /** The PDF had no usable text layer, so the model read the pages (and wrote a digest). */
  read_visually?: boolean;
  // photos
  location_guess?: string;
  is_suitable_for_social?: boolean;
  // datasets
  variables?: DatasetVariable[];
  /** Table and monthly chart for dataset pages (lib/datasets/preview.ts). */
  preview?: import('../datasets/preview').DatasetPreview;
  temporal_coverage?: string;
  spatial_coverage?: string;
  // videos (AI output)
  chapters?: VideoChapter[];
  /** Seconds of the video the model analysed, when a long recording was only partly analysed. */
  analysed_seconds?: number;
  // Source details recorded at import (not AI output); kept across re-ingestion.
  video?: VideoSource;
  event?: EventSource;
}

export interface VideoChapter {
  start_s: number;
  title: string;
  title_hi?: string;
}

/** A video on YouTube, embedded (never downloaded or re-hosted). */
export interface VideoSource {
  youtube_id: string;
  channel: string;
  channel_url: string;
  published: string;
  duration_s: number;
  language: 'en' | 'hi';
  credit: string;
}

/** An institutional activity, with the primary source it was recorded from. */
export interface EventSource {
  starts_at: string;
  ends_at?: string | null;
  venue: string;
  is_online: boolean;
  source_name: string;
  source_url: string;
  extra_sources?: string[];
  /** YouTube ids of recordings of this event. */
  videos?: string[];
}

export interface AssetChunk {
  id: string;
  asset_id: string;
  chunk_index: number;
  content: string;
  content_tsv?: string;
  embedding?: number[];
}

export interface HybridSearchResult {
  id: string;
  title: string;
  description: string;
  ai_summary?: string;
  type: AssetType;
  region: PolarRegion;
  score: number;
  rank_fulltext: number;
  rank_vector: number;
}

export interface ContentPost {
  id: string;
  asset_id: string;
  channel: SocialChannel;
  language: string;
  body: string;
  hashtags: string[];
  image_url?: string;
  status: PostStatus;
  scheduled_at?: string;
  reviewer_id?: string;
  review_note?: string;
  created_by?: string;
  created_at: string;
  updated_at?: string;
  published_at?: string | null;
  /** Joined by the staff /api/posts endpoints. */
  asset?: Pick<Asset, 'id' | 'title' | 'status' | 'thumbnail' | 'access_level'> | null;
}

export interface Lesson {
  id: string;
  asset_id: string;
  title: string;
  grade_band: GradeBand;
  language: string;
  content_md: string;
  learning_objectives: string[];
  status: AssetStatus;
  created_at: string;
}

export interface QuizQuestion {
  q: string;
  options: string[];
  answer_index: number;
  explanation: string;
}

export interface Quiz {
  id: string;
  lesson_id: string;
  questions: QuizQuestion[];
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  user_name: string;
  school: string;
  score: number;
  certificate_id: string;
  created_at: string;
}

export interface ChatLog {
  id: string;
  session_id: string;
  question: string;
  answer: string;
  cited_asset_ids: string[];
  created_at: string;
}

export interface AnalyticsEvent {
  id: string;
  event: 'view' | 'download' | 'search' | 'share' | 'chat' | 'quiz_complete';
  asset_id?: string;
  meta?: Record<string, any>;
  created_at: string;
}

export interface AIJob {
  id: string;
  asset_id: string;
  job_type: string;
  status: AIJobStatus;
  error?: string;
  tokens_in?: number;
  tokens_out?: number;
  created_at: string;
  finished_at?: string;
}
