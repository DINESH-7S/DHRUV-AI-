import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Asset } from '../types/database';
import { isDbConfigured } from '../env';
import { supabaseAdmin } from './admin';
import { getCurrentUser, STAFF_ROLES } from './auth';
import { ARCHIVE_BUCKET } from './buckets';
import { MOCK_ASSETS } from './mock-data';
import { createSupabaseServerClient } from './server';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface AssetViewer {
  isStaff: boolean;
  /** Staff: service-role client (sees drafts). Public: RLS-bound client (published + public only). */
  client: SupabaseClient | null;
}

export async function resolveViewer(): Promise<AssetViewer> {
  if (!isDbConfigured()) return { isStaff: false, client: null };
  const user = await getCurrentUser();
  const isStaff = !!user && STAFF_ROLES.includes(user.role);
  return { isStaff, client: isStaff ? supabaseAdmin() : await createSupabaseServerClient() };
}

/**
 * The asset as this viewer may see it, or null (→ 404). Staff can preview drafts and
 * restricted items; the public only sees published, public assets. Mock ids (non-UUID)
 * resolve against mock data so seeded demo links keep working.
 */
export async function getAssetForViewer(id: string, viewer: AssetViewer): Promise<Asset | null> {
  if (!viewer.client || !UUID.test(id)) return MOCK_ASSETS.find((a) => a.id === id) ?? null;
  const { data } = await viewer.client.from('assets').select('*').eq('id', id).maybeSingle<Asset>();
  return data ?? null;
}

export interface RelatedAssets {
  items: Asset[];
  /** 'semantic' = embedding similarity; 'region' = fallback when the asset has no embeddings yet. */
  method: 'semantic' | 'region';
}

export async function getRelatedAssets(asset: Asset, viewer: AssetViewer, count = 4): Promise<RelatedAssets> {
  if (!viewer.client) {
    return { items: MOCK_ASSETS.filter((a) => a.id !== asset.id && a.region === asset.region).slice(0, count), method: 'region' };
  }

  const { data: matches } = await viewer.client.rpc('related_assets', { p_asset_id: asset.id, match_count: count });
  const ids = ((matches ?? []) as { related_id: string }[]).map((m) => m.related_id);

  if (ids.length > 0) {
    let query = viewer.client.from('assets').select('*').in('id', ids);
    if (!viewer.isStaff) query = query.eq('status', 'published');
    const { data } = await query;
    const byId = new Map(((data ?? []) as Asset[]).map((a) => [a.id, a]));
    const items = ids.map((id) => byId.get(id)).filter((a): a is Asset => !!a);
    if (items.length > 0) return { items, method: 'semantic' };
  }

  const { data } = await viewer.client
    .from('assets')
    .select('*')
    .eq('region', asset.region)
    .eq('status', 'published')
    .neq('id', asset.id)
    .order('published_at', { ascending: false })
    .limit(count);
  return { items: (data ?? []) as Asset[], method: 'region' };
}

export interface MediaLinks {
  /** For an event: the video assets that record it. */
  recordings: Asset[];
  /** For a video: the event it records, if any. */
  recordingOf: Asset | null;
}

/** Links between events and their recordings, both stored as assets (see scripts/import-media.ts). */
export async function getMediaLinks(asset: Asset, viewer: AssetViewer): Promise<MediaLinks> {
  const none: MediaLinks = { recordings: [], recordingOf: null };
  if (!viewer.client) return none;
  // Staff may preview drafts; the public client is RLS-bound, and we also filter explicitly.
  const statuses = viewer.isStaff ? ['draft', 'processing', 'ready', 'published'] : ['published'];

  const ids = asset.type === 'event' ? asset.ai_metadata?.event?.videos ?? [] : [];
  if (ids.length) {
    const { data } = await viewer.client
      .from('assets')
      .select('*')
      .eq('type', 'video')
      .in('status', statuses)
      .in('ai_metadata->video->>youtube_id', ids);
    return { ...none, recordings: (data ?? []) as Asset[] };
  }
  const youtubeId = asset.type === 'video' ? asset.ai_metadata?.video?.youtube_id : undefined;
  if (youtubeId) {
    const { data } = await viewer.client
      .from('assets')
      .select('*')
      .eq('type', 'event')
      .in('status', statuses)
      .contains('ai_metadata', { event: { videos: [youtubeId] } })
      .limit(1);
    return { ...none, recordingOf: ((data ?? []) as Asset[])[0] ?? null };
  }
  return none;
}

/** Short-lived signed URL for previewing/downloading the original file. Call only after getAssetForViewer. */
export async function signedFileUrl(asset: Asset, { download = false, expiresIn = 600 } = {}): Promise<string | null> {
  if (!asset.file_path || !isDbConfigured() || !UUID.test(asset.id)) return null;
  const fileName = asset.file_path.split('/').pop();
  const { data } = await supabaseAdmin()
    .storage.from(ARCHIVE_BUCKET)
    .createSignedUrl(asset.file_path, expiresIn, download ? { download: fileName ?? true } : undefined);
  return data?.signedUrl ?? null;
}

/** Counts a view/download and logs an analytics event. Never throws: analytics must not break pages. */
export async function trackAssetEvent(assetId: string, kind: 'view' | 'download'): Promise<void> {
  if (!isDbConfigured() || !UUID.test(assetId)) return;
  try {
    const db = supabaseAdmin();
    await Promise.all([
      db.rpc('increment_asset_counter', { p_asset_id: assetId, p_kind: kind }),
      db.from('analytics_events').insert({ event: kind, asset_id: assetId }),
    ]);
  } catch (err) {
    console.error(`[trackAssetEvent] ${kind} ${assetId}`, err);
  }
}
