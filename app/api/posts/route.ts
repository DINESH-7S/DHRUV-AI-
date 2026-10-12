import { NextResponse } from 'next/server';
import { fail, handleApiError } from '@/lib/api';
import { supabaseAdmin } from '@/lib/db/admin';
import { requireRole, STAFF_ROLES } from '@/lib/db/auth';
import { isDbConfigured } from '@/lib/env';
import type { PostStatus } from '@/lib/types/database';

export const runtime = 'nodejs';

const STATUSES: PostStatus[] = ['draft', 'in_review', 'approved', 'scheduled', 'published', 'rejected'];

/** GET ?status=in_review,approved&assetId=<uuid> → staff view of content posts, newest first, with their asset. */
export async function GET(req: Request) {
  try {
    await requireRole(STAFF_ROLES);
    if (!isDbConfigured()) return fail('Supabase is not configured yet.', 503);

    const params = new URL(req.url).searchParams;
    const statuses = (params.get('status') ?? '').split(',').filter((s): s is PostStatus => STATUSES.includes(s as PostStatus));
    const assetId = params.get('assetId');

    let query = supabaseAdmin()
      .from('content_posts')
      .select('*, asset:assets(id, title, status, thumbnail, access_level)')
      .order('created_at', { ascending: false })
      .limit(200);
    if (statuses.length) query = query.in('status', statuses);
    if (assetId) query = query.eq('asset_id', assetId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return NextResponse.json(data);
  } catch (err) {
    return handleApiError(err, 'api/posts');
  }
}
