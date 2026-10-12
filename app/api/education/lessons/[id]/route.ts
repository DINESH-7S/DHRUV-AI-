import { NextResponse } from 'next/server';
import * as z from 'zod/v4';
import { fail, handleApiError } from '@/lib/api';
import { supabaseAdmin } from '@/lib/db/admin';
import { getCurrentUser, STAFF_ROLES } from '@/lib/db/auth';
import { LESSON_PUBLISH_ROLES } from '@/lib/db/workflow';
import { isDbConfigured } from '@/lib/env';
import type { Lesson, QuizQuestion } from '@/lib/types/database';
import { revalidateTag } from 'next/cache';
import { PUBLIC_DATA_TAG } from '@/lib/db/supabase';

export const runtime = 'nodejs';

/**
 * GET → { lesson, quiz: { id, questions: [{ q, options }] } | null }.
 * The public only sees published lessons and never the answer key; staff get answers
 * (for review) when they pass ?answers=1.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!isDbConfigured()) return fail('Supabase is not configured yet.', 503);
    if (!z.uuid().safeParse(id).success) return fail('Lesson not found.', 404);

    const user = await getCurrentUser();
    const isStaff = !!user && STAFF_ROLES.includes(user.role);

    const db = supabaseAdmin();
    const { data: lesson } = await db.from('lessons').select('*').eq('id', id).maybeSingle<Lesson>();
    if (!lesson || (lesson.status !== 'published' && !isStaff)) return fail('Lesson not found.', 404);

    const { data: quiz } = await db.from('quizzes').select('id, questions').eq('lesson_id', id).maybeSingle();
    const withAnswers = isStaff && new URL(req.url).searchParams.get('answers') === '1';
    const questions = ((quiz?.questions ?? []) as QuizQuestion[]).map((q) =>
      withAnswers ? q : { q: q.q, options: q.options },
    );

    return NextResponse.json({ lesson, quiz: quiz ? { id: quiz.id, questions } : null });
  } catch (err) {
    return handleApiError(err, 'api/education/lessons/[id] GET');
  }
}

const PatchBody = z.object({ action: z.enum(['publish', 'unpublish']) });

/** PATCH { action: 'publish' | 'unpublish' } → lesson. Reviewers and admins only. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!isDbConfigured()) return fail('Supabase is not configured yet.', 503);
    if (!z.uuid().safeParse(id).success) return fail('Lesson not found.', 404);

    const user = await getCurrentUser();
    if (!user) return fail('Please sign in first.', 401);
    if (!LESSON_PUBLISH_ROLES.includes(user.role)) return fail(`Your role (${user.role}) cannot publish lessons.`, 403);

    const parsed = PatchBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail('Body must be { "action": "publish" | "unpublish" }.', 400);
    const publish = parsed.data.action === 'publish';

    const db = supabaseAdmin();
    const { data: updated, error } = await db
      .from('lessons')
      .update({ status: publish ? 'published' : 'draft' })
      .eq('id', id)
      .eq('status', publish ? 'draft' : 'published')
      .select('*')
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!updated) return fail(`Lesson not found or already ${publish ? 'published' : 'unpublished'}.`, 409);

    await db.from('audit_log').insert({
      actor_id: user.id, action: `lesson_${parsed.data.action}`, entity: 'lessons', entity_id: id, diff: null,
    });
    // Public pages cache published data for a minute; show this change right away.
    revalidateTag(PUBLIC_DATA_TAG);
    return NextResponse.json(updated);
  } catch (err) {
    return handleApiError(err, 'api/education/lessons/[id] PATCH');
  }
}
