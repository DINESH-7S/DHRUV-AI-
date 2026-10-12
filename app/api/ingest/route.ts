import { after, NextResponse } from 'next/server';
import * as z from 'zod/v4';
import { runIngestion } from '@/lib/ai/ingest';
import { supabaseAdmin } from '@/lib/db/admin';
import { AuthError, requireRole, STAFF_ROLES, UPLOAD_ROLES } from '@/lib/db/auth';
import { isDbConfigured } from '@/lib/env';

export const runtime = 'nodejs';
// Ingestion runs in after() and must finish within the function's lifetime.
export const maxDuration = 300;

/** A pending/processing job older than this is assumed dead (e.g. the server restarted mid-run). */
const STALE_JOB_MS = 10 * 60 * 1000;

const StartSchema = z.object({ assetId: z.uuid() });

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

function handleError(err: unknown) {
  if (err instanceof AuthError) return fail(err.message, err.status);
  console.error('[api/ingest]', err);
  return fail(err instanceof Error ? err.message : 'Unexpected error.', 500);
}

/** POST { assetId } → 202 { jobId }. Starts (or retries) AI ingestion; the file must already be in Storage. */
export async function POST(req: Request) {
  try {
    await requireRole(UPLOAD_ROLES);
    if (!isDbConfigured()) return fail('Supabase is not configured yet.', 503);

    const parsed = StartSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail('Body must be { "assetId": "<uuid>" }.', 400);
    const { assetId } = parsed.data;

    const db = supabaseAdmin();
    const { data: asset } = await db.from('assets').select('id, status').eq('id', assetId).maybeSingle();
    if (!asset) return fail('Asset not found.', 404);

    const { data: active } = await db
      .from('ai_jobs')
      .select('id, created_at')
      .eq('asset_id', assetId)
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (active) {
      if (Date.now() - new Date(active.created_at).getTime() < STALE_JOB_MS) {
        return NextResponse.json({ jobId: active.id, alreadyRunning: true }, { status: 202 });
      }
      await db
        .from('ai_jobs')
        .update({ status: 'failed', error: 'Timed out without finishing.', finished_at: new Date().toISOString() })
        .eq('id', active.id);
    }

    const { data: job, error } = await db
      .from('ai_jobs')
      .insert({ asset_id: assetId, job_type: 'ingest', status: 'pending' })
      .select('id')
      .single();
    if (error || !job) throw new Error(`Could not create the AI job: ${error?.message}`);

    if (asset.status !== 'published') {
      await db.from('assets').update({ status: 'processing' }).eq('id', assetId);
    }

    after(() => runIngestion(job.id, assetId));
    return NextResponse.json({ jobId: job.id }, { status: 202 });
  } catch (err) {
    return handleError(err);
  }
}

/** GET ?jobId=<uuid> → current job and asset status, for polling from the upload page. */
export async function GET(req: Request) {
  try {
    await requireRole(STAFF_ROLES);
    if (!isDbConfigured()) return fail('Supabase is not configured yet.', 503);

    const jobId = new URL(req.url).searchParams.get('jobId') ?? '';
    if (!z.uuid().safeParse(jobId).success) return fail('Query must include a valid jobId.', 400);

    const db = supabaseAdmin();
    const { data: job } = await db
      .from('ai_jobs')
      .select('id, asset_id, status, error')
      .eq('id', jobId)
      .maybeSingle();
    if (!job) return fail('Job not found.', 404);

    const { data: asset } = await db.from('assets').select('status').eq('id', job.asset_id).maybeSingle();
    return NextResponse.json({
      jobId: job.id,
      assetId: job.asset_id,
      status: job.status,
      error: job.error,
      assetStatus: asset?.status ?? null,
    });
  } catch (err) {
    return handleError(err);
  }
}
