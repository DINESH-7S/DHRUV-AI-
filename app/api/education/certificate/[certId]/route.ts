import { NextResponse } from 'next/server';
import { fail, handleApiError } from '@/lib/api';
import { supabaseAdmin } from '@/lib/db/admin';
import { isDbConfigured } from '@/lib/env';

export const runtime = 'nodejs';

const CERT_ID = /^DHRUV-\d{4}-[0-9A-F]{10}$/;

interface AttemptRow {
  certificate_id: string;
  user_name: string;
  school: string;
  score: number;
  created_at: string;
  quiz: { questions: unknown[]; lesson: { title: string; grade_band: string } | null } | null;
}

/** GET → certificate details for display and public verification, or 404 if it was never issued. */
export async function GET(_req: Request, { params }: { params: Promise<{ certId: string }> }) {
  try {
    const { certId } = await params;
    if (!isDbConfigured()) return fail('Supabase is not configured yet.', 503);
    const id = decodeURIComponent(certId).trim().toUpperCase();
    if (!CERT_ID.test(id)) return fail('Certificate not found.', 404);

    const { data } = await supabaseAdmin()
      .from('quiz_attempts')
      .select('certificate_id, user_name, school, score, created_at, quiz:quizzes(questions, lesson:lessons(title, grade_band))')
      .eq('certificate_id', id)
      .maybeSingle<AttemptRow>();
    if (!data) return fail('Certificate not found.', 404);

    return NextResponse.json({
      certificate_id: data.certificate_id,
      user_name: data.user_name,
      school: data.school,
      lesson_title: data.quiz?.lesson?.title ?? null,
      grade_band: data.quiz?.lesson?.grade_band ?? null,
      score: data.score,
      total: data.quiz?.questions.length ?? null,
      issued_at: data.created_at,
    });
  } catch (err) {
    return handleApiError(err, 'api/education/certificate/[certId]');
  }
}
