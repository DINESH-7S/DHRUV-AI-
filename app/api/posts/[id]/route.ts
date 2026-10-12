import { NextResponse } from 'next/server';
import * as z from 'zod/v4';
import { validatePost } from '@/lib/ai/campaign';
import { fail, handleApiError } from '@/lib/api';
import { supabaseAdmin } from '@/lib/db/admin';
import { getCurrentUser } from '@/lib/db/auth';
import { POST_ACTIONS, POST_TRANSITIONS } from '@/lib/db/workflow';
import { isDbConfigured } from '@/lib/env';
import type { ContentPost } from '@/lib/types/database';
import { revalidateTag } from 'next/cache';
import { PUBLIC_DATA_TAG } from '@/lib/db/supabase';
import { postToTelegram, telegramConfigured, type TelegramResult } from '@/lib/social/telegram';
import { resolveSiteLinks, siteUrl } from '@/lib/site';
import { verifyPath } from '@/lib/posts/code';

/** Social channels whose approved posts go live on DHRUV's Telegram channel (see lib/social/telegram.ts). */
const TELEGRAM_CHANNELS = new Set(['x', 'instagram', 'linkedin', 'facebook']);

export const runtime = 'nodejs';

const PatchBody = z.object({
  action: z.enum(POST_ACTIONS),
  note: z.string().trim().max(2000).optional(),
  body: z.string().trim().min(1).max(20_000).optional(),
  hashtags: z.array(z.string().trim()).max(30).optional(),
  scheduledAt: z.iso.datetime({ offset: true }).optional(),
});

/**
 * PATCH { action, note?, body?, hashtags?, scheduledAt? } → updated ContentPost.
 * Enforces the state machine in lib/db/workflow.ts, role checks, and separation of duties
 * (whoever generated a post cannot approve it).
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!isDbConfigured()) return fail('Supabase is not configured yet.', 503);
    if (!z.uuid().safeParse(id).success) return fail('Invalid post id.', 400);

    const user = await getCurrentUser();
    if (!user) return fail('Please sign in first.', 401);

    const parsed = PatchBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail(parsed.error.issues.map((i) => i.message).join(' '), 400);
    const { action, note, body, hashtags, scheduledAt } = parsed.data;
    const transition = POST_TRANSITIONS[action];

    if (!transition.roles.includes(user.role)) {
      return fail(`Your role (${user.role}) cannot ${action} posts.`, 403);
    }

    const db = supabaseAdmin();
    const { data: post } = await db.from('content_posts').select('*').eq('id', id).maybeSingle<ContentPost>();
    if (!post) return fail('Post not found.', 404);
    if (!transition.from.includes(post.status)) {
      return fail(`Cannot ${action} a post that is "${post.status}".`, 409);
    }

    const now = new Date().toISOString();
    const update: Record<string, unknown> = { updated_at: now };
    if (transition.to) update.status = transition.to;

    switch (action) {
      case 'approve':
        if (user.id && post.created_by && user.id === post.created_by) {
          return fail('You generated this post, so someone else must approve it.', 403);
        }
        update.reviewer_id = user.id;
        if (note) update.review_note = note;
        break;
      case 'reject':
        if (!note) return fail('Add a note explaining what needs to change.', 400);
        update.reviewer_id = user.id;
        update.review_note = note;
        break;
      case 'schedule':
        if (!scheduledAt || new Date(scheduledAt) <= new Date()) return fail('Pick a future date and time.', 400);
        update.scheduled_at = scheduledAt;
        break;
      case 'publish': {
        const { data: asset } = await db.from('assets').select('id, status').eq('id', post.asset_id).maybeSingle();
        if (!asset || (asset.status !== 'ready' && asset.status !== 'published')) {
          return fail('The source asset is not ready, so this post cannot be published yet.', 409);
        }
        // Publishing a reviewed post also publishes its source asset, so the post's link works for the public.
        if (asset.status === 'ready') {
          await db.from('assets').update({ status: 'published', published_at: now }).eq('id', asset.id).eq('status', 'ready');
          await db.from('audit_log').insert({
            actor_id: user.id, action: 'asset_published', entity: 'assets', entity_id: asset.id, diff: { via_post: post.id },
          });
        }
        update.published_at = now;
        break;
      }
      case 'unpublish':
        update.published_at = null;
        break;
      case 'edit': {
        const edited = { channel: post.channel, body: body ?? post.body, hashtags: hashtags ?? post.hashtags };
        if (body === undefined && hashtags === undefined) return fail('Nothing to edit.', 400);
        const problem = validatePost(edited);
        if (problem) return fail(`The ${post.channel} post ${problem}.`, 400);
        update.body = edited.body;
        update.hashtags = edited.hashtags;
        break;
      }
    }

    // Conditional on the status we read, so two reviewers clicking at once cannot both win.
    const { data: updated, error } = await db
      .from('content_posts')
      .update(update)
      .eq('id', id)
      .eq('status', post.status)
      .select('*, asset:assets(id, title, status, thumbnail, access_level)')
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!updated) return fail('Someone else changed this post just now. Reload and try again.', 409);

    await db.from('audit_log').insert({
      actor_id: user.id,
      action: `post_${action}`,
      entity: 'content_posts',
      entity_id: id,
      diff: { from: post.status, to: transition.to ?? post.status, note: note ?? null },
    });

    // A published social post goes out for real: to DHRUV's Telegram channel, when configured.
    let telegram: TelegramResult | undefined;
    if (action === 'publish' && TELEGRAM_CHANNELS.has(post.channel) && telegramConfigured()) {
      const tags = (post.hashtags ?? []).map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ');
      // The last line is the post's QR label as a link: anyone can check it was approved and unchanged.
      const verify = `Check it is genuine: ${siteUrl()}${verifyPath(post.id)}`;
      const text = [resolveSiteLinks(post.body), tags, `${siteUrl()}/asset/${post.asset_id}`, verify].filter(Boolean).join('\n\n');
      const image = post.image_url ?? updated.asset?.thumbnail ?? null;
      telegram = await postToTelegram({ text, imageUrl: image && /^https:\/\//.test(image) ? image : null });
      await db.from('audit_log').insert({
        actor_id: user.id, action: telegram.ok ? 'post_sent_telegram' : 'post_telegram_failed', entity: 'content_posts', entity_id: id,
        diff: { url: telegram.url ?? null, error: telegram.error ?? null },
      });
    }

    // Public pages cache published data for a minute; show this change right away.
    revalidateTag(PUBLIC_DATA_TAG);
    return NextResponse.json(telegram ? { ...updated, telegram } : updated);
  } catch (err) {
    return handleApiError(err, 'api/posts/[id]');
  }
}
