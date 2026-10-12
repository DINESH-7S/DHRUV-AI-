import { expandQuery } from '../search/glossary';
import { createClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';
import { MOCK_STATIONS, MOCK_EXPEDITIONS, MOCK_ASSETS, MOCK_POSTS, MOCK_LESSONS } from './mock-data';
import { Asset, Station, Expedition, ContentPost } from '../types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-anon-key';

/**
 * Mock *data* mode: Supabase is not configured at all (local UI work without a database).
 * Independent of AI_MOCK, which only affects AI calls. With a configured database these
 * functions NEVER return mock data: a failure throws DataUnavailableError, which the page
 * shows as an honest error (app/(public)/error.tsx). Fake content must never look real.
 */
export const isMockMode = () => {
  return supabaseUrl.includes('127.0.0.1') || supabaseUrl.includes('your-project') || supabaseAnonKey === 'mock-anon-key' || supabaseAnonKey.startsWith('your-');
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/** Tag on every cached public query; staff actions call revalidateTag(PUBLIC_DATA_TAG). */
export const PUBLIC_DATA_TAG = 'public-data';

/**
 * Public data is the same for every visitor (anon client, RLS: published + public only), so it is
 * cached across requests for a minute instead of costing a database round trip per page view.
 * Staff actions refresh it at once. Errors are never cached. Results must be plain JSON.
 */
function cached<A extends unknown[], R>(key: string, fn: (...args: A) => Promise<R>): (...args: A) => Promise<R> {
  // Client components (e.g. Explore) call these in the browser, where the server cache does not exist.
  if (typeof window !== 'undefined') return fn;
  return unstable_cache(fn, ['public', key], { revalidate: 60, tags: [PUBLIC_DATA_TAG] });
}

export class DataUnavailableError extends Error {
  constructor(what: string, cause?: unknown) {
    super(`Could not load ${what}.`);
    this.name = 'DataUnavailableError';
    console.error(`[data] ${what}`, cause);
  }
}

const queryStations = cached('stations', async (): Promise<Station[]> => {
  const { data, error } = await supabase.from('stations').select('*').order('established_year', { ascending: true });
  if (error) throw new DataUnavailableError('stations', error);
  return (data ?? []) as Station[];
});

export async function fetchStations(): Promise<Station[]> {
  return isMockMode() ? MOCK_STATIONS : queryStations();
}

const queryExpeditions = cached('expeditions', async (): Promise<Expedition[]> => {
  const { data, error } = await supabase.from('expeditions').select('*').order('start_date', { ascending: false });
  if (error) throw new DataUnavailableError('expeditions', error);
  return (data ?? []) as Expedition[];
});

export async function fetchExpeditions(): Promise<Expedition[]> {
  return isMockMode() ? MOCK_EXPEDITIONS : queryExpeditions();
}

interface AssetFilters {
  type?: string;
  region?: string;
  station_id?: string;
  expedition_id?: string;
  search?: string;
}

export async function fetchAssets(filters?: AssetFilters): Promise<Asset[]> {
  if (isMockMode()) {
    let result = [...MOCK_ASSETS];
    if (filters?.type && filters.type !== 'all') result = result.filter(a => a.type === filters.type);
    if (filters?.region && filters.region !== 'all') result = result.filter(a => a.region === filters.region);
    if (filters?.station_id && filters.station_id !== 'all') result = result.filter(a => a.station_id === filters.station_id);
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.ai_keywords?.some(k => k.toLowerCase().includes(q))
      );
    }
    return result;
  }

  return queryAssets(filters ?? {});
}

const queryAssets = cached('assets', async (filters: AssetFilters): Promise<Asset[]> => {
  // RLS limits the public to published + public assets.
  let query = supabase.from('assets').select('*').eq('status', 'published');
  if (filters?.type && filters.type !== 'all') query = query.eq('type', filters.type);
  if (filters?.region && filters.region !== 'all') query = query.eq('region', filters.region);
  if (filters?.station_id && filters.station_id !== 'all') query = query.eq('station_id', filters.station_id);
  if (filters?.expedition_id && filters.expedition_id !== 'all') query = query.eq('expedition_id', filters.expedition_id);
  if (filters?.search?.trim()) {
    // Full-text search over title (EN + HI), keywords, summary, description and authors.
    // A Hindi query also matches the English words for its terms (lib/search/glossary.ts).
    query = query.textSearch('search_tsv', expandQuery(filters.search.trim()), { type: 'websearch', config: 'english' });
  }

  const { data, error } = await query.order('published_at', { ascending: false, nullsFirst: false });
  if (error) throw new DataUnavailableError('archive items', error);
  return (data ?? []) as Asset[];
});

/** Published assets by id (e.g. the archive photos used as station and expedition covers). */
export async function fetchAssetsByIds(ids: string[]): Promise<Map<string, Asset>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return new Map();
  if (isMockMode()) return new Map(MOCK_ASSETS.filter(a => unique.includes(a.id)).map(a => [a.id, a]));
  const data = await queryAssetsByIds(unique.sort());
  return new Map(data.map(a => [a.id, a]));
}

const queryAssetsByIds = cached('assets-by-id', async (ids: string[]): Promise<Asset[]> => {
  const { data, error } = await supabase.from('assets').select('*').eq('status', 'published').in('id', ids);
  if (error) throw new DataUnavailableError('cover photos', error);
  return (data ?? []) as Asset[];
});

/** Published assets whose thumbnail is one of these URLs (covers set before migration 05). */
export async function fetchAssetsByThumbnail(urls: string[]): Promise<Map<string, Asset>> {
  const unique = [...new Set(urls.filter(Boolean))];
  if (unique.length === 0 || isMockMode()) return new Map();
  const { data, error } = await supabase.from('assets').select('*').eq('status', 'published').in('thumbnail', unique);
  if (error) throw new DataUnavailableError('cover photos', error);
  return new Map((data ?? []).map(a => [a.thumbnail as string, a as Asset]));
}

/** Number of published assets linked to each expedition. */
export async function countAssetsByExpedition(): Promise<Map<string, number>> {
  if (isMockMode()) return new Map();
  const counts = new Map<string, number>();
  for (const id of await queryExpeditionLinks()) counts.set(id, (counts.get(id) ?? 0) + 1);
  return counts;
}

const queryExpeditionLinks = cached('expedition-links', async (): Promise<string[]> => {
  const { data, error } = await supabase.from('assets').select('expedition_id').eq('status', 'published').not('expedition_id', 'is', null);
  if (error) throw new DataUnavailableError('expedition links', error);
  return (data ?? []).map((row) => row.expedition_id as string);
});

/** Published posts for the public site, newest first. Empty stays empty. */
export async function fetchContentPosts(): Promise<ContentPost[]> {
  return isMockMode() ? MOCK_POSTS : queryContentPosts();
}

const queryContentPosts = cached('posts', async (): Promise<ContentPost[]> => {
  const { data, error } = await supabase
    .from('content_posts')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false });
  if (error) throw new DataUnavailableError('news', error);
  return (data ?? []) as ContentPost[];
});

export async function countPublishedLessons(): Promise<number> {
  return isMockMode() ? MOCK_LESSONS.length : queryLessonCount();
}

const queryLessonCount = cached('lesson-count', async (): Promise<number> => {
  const { count, error } = await supabase.from('lessons').select('id', { count: 'exact', head: true }).eq('status', 'published');
  if (error) throw new DataUnavailableError('lessons', error);
  return count ?? 0;
});
