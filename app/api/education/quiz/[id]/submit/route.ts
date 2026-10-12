import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import * as z from 'zod/v4';
import { fail, handleApiError } from '@/lib/api';
import { supabaseAdmin } from '@/lib/db/admin';
import { PASS_PERCENT } from '@/lib/db/workflow';
import { isDbConfigured } from '@/lib/env';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import type { QuizQuestion } from '@/lib/types/database';

export const runtime = 'nodejs';

const SubmitBody = z.object({
  /** One entry per question: the chosen option index, or -1 if unanswered. */
  answers: z.array(z.number().int().min(-1)),
  /** Data minimisation (DPDP): only the name printed on the certificate; initials are fine. */
  user_name: z.string().trim().min(2, 'Enter the name to print on the certificate.').max(80),
  /** Optional. Learners are often minors: never require more personal data than needed. */
  school: z.string().trim().max(120).optional().transform(v => v ?? ''),
});

/** Human-readable and hard to guess, e.g. DHRUV-2026-9F3A1C07B2. */
function newCertificateId(): string {
  return `DHRUV-${new Date().getFullYear()}-${randomBytes(5).toString('hex').toUpperCase()}`;
}

/**
 * POST { answers, user_name, school } → score + per-question explanations, and a certificate
 * id when the score reaches the pass mark. Grading happens here: the browser never sees the key
 * before submitting, so certificates cannot be forged by editing the page.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!isDbConfigured()) return fail('Supabase is not configured yet.', 503);
    if (!z.uuid().safeParse(id).success) return fail('Quiz not found.', 404);

    const wait = rateLimit(`quiz:${clientKey(req, null)}`, 20, 10 * 60 * 1000);
    if (wait) return fail(`Too many attempts. Try again in ${wait}s.`, 429);

    const parsed = SubmitBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail(parsed.error.issues.map((i) => i.message).join(' '), 400);
    const { answers, user_name, school } = parsed.data;

    const db = supabaseAdmin();
    const { data: quiz } = await db
      .from('quizzes')
      .select('id, questions, lesson:lessons(id, status)')
      .eq('id', id)
      .maybeSingle<{ id: string; questions: QuizQuestion[]; lesson: { id: string; status: string } | null }>();
    if (!quiz || quiz.lesson?.status !== 'published') return fail('Quiz not found.', 404);

    const questions = quiz.questions;
    if (answers.length !== questions.length) {
      return fail(`Expected ${questions.length} answers, received ${answers.length}.`, 400);
    }

    const results = questions.map((q, i) => ({
      correct: answers[i] === q.answer_index,
      answer_index: q.answer_index,
      explanation: q.explanation,
    }));
    const score = results.filter((r) => r.correct).length;
    const total = questions.length;
    const percent = Math.round((score / total) * 100);
    const passed = percent >= PASS_PERCENT;

    let certificate_id: string | null = null;
    if (passed) {
      certificate_id = newCertificateId();
      const { error } = await db.from('quiz_attempts').insert({ quiz_id: quiz.id, user_name, school, score, certificate_id });
      if (error) throw new Error(`Issuing the certificate failed: ${error.message}`);
    }

    await db.from('analytics_events').insert({
      event: 'quiz_complete',
      meta: { quiz_id: quiz.id, lesson_id: quiz.lesson?.id, score, total, passed },
    });

    return NextResponse.json({ score, total, percent, passed, certificate_id, results });
  } catch (err) {
    return handleApiError(err, 'api/education/quiz/[id]/submit');
  }
}
