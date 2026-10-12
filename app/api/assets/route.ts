import { NextResponse } from 'next/server';
import { fail, handleApiError } from '@/lib/api';
import { supabaseAdmin } from '@/lib/db/admin';
import { requireRole, STAFF_ROLES } from '@/lib/db/auth';
import { isDbConfigured } from '@/lib/env';
import type { AssetStatus } from '@/lib/types/database';
import { humanCheckedIds } from '@/lib/db/review';

export const runtime = 'nodejs';

const STATUSES: AssetStatus[] = ['draft', 'processing', 'ready', 'published', 'archived'];

/**
 * GET ?status=ready,published → staff asset list (includes unpublished items), newest first.
 * &unchecked=1 keeps only items no person has approved yet (published by an import script).
 */
export async function GET(req: Request) {
  try {
    await requireRole(STAFF_ROLES);
    if (!isDbConfigured()) return fail('Supabase is not configured yet.', 503);

    const statuses = (new URL(req.url).searchParams.get('status') ?? '')
      .split(',')
      .filter((s): s is AssetStatus => STATUSES.includes(s as AssetStatus));

    let query = supabaseAdmin()
      .from('assets')
      .select('id, type, title, title_hi, status, access_level, thumbnail, region, year, ai_summary, created_at, published_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (statuses.length) query = query.in('status', statuses);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    if (new URL(req.url).searchParams.get('unchecked') === '1') {
      const checked = await humanCheckedIds((data ?? []).map((a) => a.id as string));
      return NextResponse.json((data ?? []).filter((a) => !checked.has(a.id as string)));
    }
    return NextResponse.json(data);
  } catch (err) {
    return handleApiError(err, 'api/assets');
  }
}
