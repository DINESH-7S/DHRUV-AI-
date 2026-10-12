import { NextResponse } from 'next/server';
import * as z from 'zod/v4';
import { generateLesson, LESSON_SOURCE_CHARS } from '@/lib/ai/lesson';
import type { TokenUsage } from '@/lib/ai/llm';
import { fail, handleApiError } from '@/lib/api';
import { supabaseAdmin } from '@/lib/db/admin';
import { getCurrentUser, requireRole, STAFF_ROLES } from '@/lib/db/auth';
import { createSupabaseServerClient } from '@/lib/db/server';
import { LESSON_GENERATE_ROLES } from '@/lib/db/workflow';
import { isDbConfigured } from '@/lib/env';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import type { Asset } from '@/lib/types/database';

export const runtime = 'nodejs';
export const maxDuration = 300;

const LIST_COLUMNS = 'id, asset_id, title, grade_band, language, learning_objectives, status, created_at';

/**
 * Quizzes are staff-only under RLS (their JSON holds the answer key), so the public client
 * cannot join them. Look up just the ids with the service role; answers never leave the server.
 */
async function withQuizId(rows: { id: string }[]) {
  if (!rows.length) return [];
  const { data } = await supabaseAdmin().from('quizzes').select('id, lesson_id').in('lesson_id', rows.map((r) => r.id));
  const quizByLesson = new Map((data ?? []).map((q) => [q.lesson_id as string, q.id as string]));
  return rows.map((lesson) => ({ ...lesson, quiz_id: quizByLesson.get(lesson.id) ?? null }));
}

/**
 * GET → published lessons (public).  GET ?all=1 → every lesson incl. drafts (staff only).
 * Optional ?grade=6-8|9-10|11-12
 */
export async function GET(req: Request) {
  try {
    if (!isDbConfigured()) return NextResponse.json([]);
    const params = new URL(req.url).searchParams;
    const grade = params.get('grade');

    let client;
    if (params.get('all') === '1') {
      await requireRole(STAFF_ROLES);
      client = supabaseAdmin();
    } else {
      client = await createSupabaseServerClient();
    }

    let query = client.from('lessons').select(LIST_COLUMNS).order('created_at', { ascending: false }).limit(200);
    if (params.get('all') !== '1') query = query.eq('status', 'published');
    if (grade === '6-8' || grade === '9-10' || grade === '11-12') query = query.eq('grade_band', grade);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return NextResponse.json(await withQuizId((data ?? []) as { id: string }[]));
  } catch (err) {
    return handleApiError(err, 'api/education/lessons GET');
  }
}

const GenerateBody = z.object({
  assetId: z.uuid(),
  gradeBand: z.enum(['6-8', '9-10', '11-12']),
  language: z.enum(['en', 'hi']).default('en'),
});

/** POST { assetId, gradeBand, language } → 201 { lesson, quiz } as a draft (staff). */
export async function POST(req: Request) {
  try {
    const user = await requireRole(LESSON_GENERATE_ROLES);
    if (!isDbConfigured()) return fail('Supabase is not configured yet.', 503);

    const wait = rateLimit(`lesson:${clientKey(req, user.id)}`, 10, 10 * 60 * 1000);
    if (wait) return fail(`Too many lessons generated. Try again in ${wait}s.`, 429);

    const parsed = GenerateBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail(parsed.error.issues.map((i) => i.message).join(' '), 400);
    const { assetId, gradeBand, language } = parsed.data;

    const db = supabaseAdmin();
    const { data: asset } = await db.from('assets').select('*').eq('id', assetId).maybeSingle<Asset>();
    if (!asset) return fail('Asset not found.', 404);
    if (asset.status !== 'ready' && asset.status !== 'published') {
      return fail(`This asset is "${asset.status}". Wait until AI processing has finished.`, 409);
    }

    // Ground the lesson in the document's own text, in reading order.
    const { data: chunks } = await db
      .from('asset_chunks')
      .select('content')
      .eq('asset_id', assetId)
      .order('chunk_index')
      .limit(Math.ceil(LESSON_SOURCE_CHARS / 3000));
    const sourceText = (chunks ?? []).map((c) => c.content).join('\n\n');

    const usage: TokenUsage = { input: 0, output: 0 };
    const generated = await generateLesson(asset, sourceText, gradeBand, language, usage);

    const { data: lesson, error } = await db
      .from('lessons')
      .insert({
        asset_id: assetId,
        title: generated.title,
        grade_band: gradeBand,
        language,
        content_md: generated.content_md,
        learning_objectives: generated.learning_objectives,
        status: 'draft',
      })
      .select('*')
      .single();
    if (error) throw new Error(`Saving the lesson failed: ${error.message}`);

    const { data: quiz, error: quizError } = await db
      .from('quizzes')
      .insert({ lesson_id: lesson.id, questions: generated.questions })
      .select('*')
      .single();
    if (quizError) {
      await db.from('lessons').delete().eq('id', lesson.id);
      throw new Error(`Saving the quiz failed: ${quizError.message}`);
    }

    await db.from('audit_log').insert({
      actor_id: (await getCurrentUser())?.id ?? null,
      action: 'lesson_generated',
      entity: 'lessons',
      entity_id: lesson.id,
      diff: { asset_id: assetId, grade_band: gradeBand, language, model: generated.model, mock: generated.mock, tokens: usage },
    });

    // Staff preview includes the answer key so reviewers can check it before publishing.
    return NextResponse.json({ lesson, quiz }, { status: 201 });
  } catch (err) {
    return handleApiError(err, 'api/education/lessons POST');
  }
}
