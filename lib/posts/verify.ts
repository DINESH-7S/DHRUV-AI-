import 'server-only';
import { supabaseAdmin } from '../db/admin';
import type { PostStatus, SocialChannel } from '../types/database';
import { POST_CODE, VERIFIABLE_STATUSES, postCode } from './code';

export interface PostCheck {
  result: 'genuine' | 'not_approved' | 'unknown';
  code: string;
  post?: {
    channel: SocialChannel;
    language: string;
    body: string;
    hashtags: string[];
    approvedAt: string | null;
    /** Role of the person who approved it (names of staff are not shown to the public). */
    approverRole: string | null;
    publishedAt: string | null;
  };
  source?: { id: string; title: string; title_hi: string | null; isPublic: boolean };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Looks a post up by its 8-character code (or full id) and says whether it was approved. Public. */
export async function checkPost(input: string): Promise<PostCheck> {
  const raw = input.trim();
  const code = UUID.test(raw) ? postCode(raw) : raw.toUpperCase();
  if (!POST_CODE.test(code)) return { result: 'unknown', code };

  const db = supabaseAdmin();
  let query = db
    .from('content_posts')
    .select('id, channel, language, body, hashtags, status, published_at, asset:assets(id, title, title_hi, status, access_level)')
    .limit(2);
  if (UUID.test(raw)) {
    query = query.eq('id', raw.toLowerCase());
  } else {
    const c = code.toLowerCase();
    query = query.gte('id', `${c}-0000-0000-0000-000000000000`).lte('id', `${c}-ffff-ffff-ffff-ffffffffffff`);
  }
  const { data, error } = await query;
  // Two posts sharing a code (very unlikely) cannot be told apart, so neither is vouched for.
  if (error || !data || data.length !== 1) return { result: 'unknown', code };

  const row = data[0] as unknown as {
    id: string; channel: SocialChannel; language: string; body: string; hashtags: string[] | null; status: PostStatus;
    published_at: string | null; asset: { id: string; title: string; title_hi: string | null; status: string; access_level: string } | null;
  };
  if (!VERIFIABLE_STATUSES.includes(row.status)) return { result: 'not_approved', code };

  const { data: approval } = await db
    .from('audit_log')
    .select('created_at, actor:profiles(role)')
    .eq('entity_id', row.id)
    .eq('action', 'post_approve')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    result: 'genuine',
    code,
    post: {
      channel: row.channel,
      language: row.language,
      body: row.body,
      hashtags: row.hashtags ?? [],
      approvedAt: (approval?.created_at as string | undefined) ?? null,
      approverRole: ((approval?.actor as { role?: string } | null)?.role as string | undefined) ?? null,
      publishedAt: row.published_at,
    },
    // The source's title is shown only when the item itself is public.
    source: row.asset
      ? row.asset.status === 'published' && row.asset.access_level === 'public'
        ? { id: row.asset.id, title: row.asset.title, title_hi: row.asset.title_hi, isPublic: true }
        : { id: '', title: '', title_hi: null, isPublic: false }
      : undefined,
  };
}
