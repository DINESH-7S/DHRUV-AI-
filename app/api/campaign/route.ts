import { NextResponse } from 'next/server';
import * as z from 'zod/v4';
import { CHANNELS, generateCampaign } from '@/lib/ai/campaign';
import type { TokenUsage } from '@/lib/ai/llm';
import { fail, handleApiError } from '@/lib/api';
import { supabaseAdmin } from '@/lib/db/admin';
import { requireRole } from '@/lib/db/auth';
import { assetLinkToken } from '@/lib/site';
import { CAMPAIGN_ROLES } from '@/lib/db/workflow';
import { isDbConfigured } from '@/lib/env';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import type { Asset } from '@/lib/types/database';

export const runtime = 'nodejs';
export const maxDuration = 300;


const CampaignRequest = z.object({
  assetId: z.uuid(),
  channels: z.array(z.enum(CHANNELS)).min(1, 'Pick at least one channel.'),
  languages: z.array(z.enum(['en', 'hi'])).min(1).default(['en']),
});

/**
 * POST { assetId, channels[], languages[] } → 201 ContentPost[] (status 'draft').
 * Generates one post per channel per language. Nothing is published here.
 */
export async function POST(req: Request) {
  try {
    const user = await requireRole(CAMPAIGN_ROLES);
    if (!isDbConfigured()) return fail('Supabase is not configured yet.', 503);

    const wait = rateLimit(`campaign:${clientKey(req, user.id)}`, 10, 10 * 60 * 1000);
    if (wait) return fail(`Too many campaigns generated. Try again in ${wait}s.`, 429);

    const parsed = CampaignRequest.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail(parsed.error.issues.map((i) => i.message).join(' '), 400);
    const channels = [...new Set(parsed.data.channels)];
    const languages = [...new Set(parsed.data.languages)];

    const db = supabaseAdmin();
    const { data: asset } = await db.from('assets').select('*').eq('id', parsed.data.assetId).maybeSingle<Asset>();
    if (!asset) return fail('Asset not found.', 404);
    if (asset.status !== 'ready' && asset.status !== 'published') {
      return fail(`This asset is "${asset.status}". Wait until AI processing has finished (status "ready").`, 409);
    }

    const usage: TokenUsage = { input: 0, output: 0 };
    const campaign = await generateCampaign(asset, channels, languages, assetLinkToken(asset.id), usage);

    const { data: posts, error } = await db
      .from('content_posts')
      .insert(
        campaign.posts.map((p) => ({
          asset_id: asset.id,
          channel: p.channel,
          language: p.language,
          body: p.body,
          hashtags: p.hashtags,
          // Restricted assets never get a public share image.
          image_url: asset.access_level === 'public' ? asset.thumbnail ?? null : null,
          status: 'draft',
          created_by: user.id,
        })),
      )
      .select('*');
    if (error) throw new Error(`Saving the campaign failed: ${error.message}`);

    await db.from('audit_log').insert({
      actor_id: user.id,
      action: 'campaign_generated',
      entity: 'assets',
      entity_id: asset.id,
      diff: { post_ids: posts.map((p) => p.id), channels, languages, model: campaign.model, mock: campaign.mock, tokens: usage },
    });

    return NextResponse.json(posts, { status: 201 });
  } catch (err) {
    return handleApiError(err, 'api/campaign');
  }
}
