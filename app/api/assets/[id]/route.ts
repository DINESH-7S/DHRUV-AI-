import { NextResponse } from 'next/server';
import * as z from 'zod/v4';
import { fail, handleApiError } from '@/lib/api';
import { supabaseAdmin } from '@/lib/db/admin';
import { getCurrentUser } from '@/lib/db/auth';
import { ASSET_ACTIONS, ASSET_TRANSITIONS } from '@/lib/db/workflow';
import { isDbConfigured } from '@/lib/env';
import { revalidateTag } from 'next/cache';
import { PUBLIC_DATA_TAG } from '@/lib/db/supabase';

export const runtime = 'nodejs';

const PatchBody = z.object({ action: z.enum(ASSET_ACTIONS) });

/** PATCH { action: 'publish' | 'unpublish' | 'verify' } → updated asset. Reviewers and admins only. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!isDbConfigured()) return fail('Supabase is not configured yet.', 503);
    if (!z.uuid().safeParse(id).success) return fail('Invalid asset id.', 400);

    const user = await getCurrentUser();
    if (!user) return fail('Please sign in first.', 401);

    const parsed = PatchBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail('Body must be { "action": "publish" | "unpublish" | "verify" }.', 400);
    const { action } = parsed.data;
    const transition = ASSET_TRANSITIONS[action];
    if (!transition.roles.includes(user.role)) return fail(`Your role (${user.role}) cannot ${action} assets.`, 403);

    const db = supabaseAdmin();
    const { data: asset } = await db.from('assets').select('id, status').eq('id', id).maybeSingle();
    if (!asset) return fail('Asset not found.', 404);
    if (!transition.from.includes(asset.status)) return fail(`Cannot ${action} an asset that is "${asset.status}".`, 409);

    // 'verify' records the check only; the item stays published with its original date.
    const { data: updated, error } =
      action === 'verify'
        ? await db.from('assets').select('*').eq('id', id).eq('status', 'published').maybeSingle()
        : await db
            .from('assets')
            .update({ status: transition.to, published_at: action === 'publish' ? new Date().toISOString() : null })
            .eq('id', id)
            .eq('status', asset.status)
            .select('*')
            .maybeSingle();
    if (error) throw new Error(error.message);
    if (!updated) return fail('Someone else changed this asset just now. Reload and try again.', 409);

    await db.from('audit_log').insert({
      actor_id: user.id, action: `asset_${action}`, entity: 'assets', entity_id: id, diff: { from: asset.status, to: transition.to },
    });
    // Public pages cache published data for a minute; show this change right away.
    revalidateTag(PUBLIC_DATA_TAG);
    return NextResponse.json(updated);
  } catch (err) {
    return handleApiError(err, 'api/assets/[id]');
  }
}
