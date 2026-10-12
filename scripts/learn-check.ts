/**
 * Checks the Smart Education flow against the running dev server (DEV_AUTH_BYPASS=true):
 * generate lesson → publish → public lesson (no answer key) → submit quiz → certificate → verify.
 * Run:  npm run learn-check   (E2E_BASE_URL defaults to http://localhost:3000)
 * Pass --keep to leave the lesson published for the demo.
 */
import { createClient } from '@supabase/supabase-js';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const KEEP = process.argv.includes('--keep');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${init?.method ?? 'GET'} ${path} → ${res.status}: ${body.error ?? JSON.stringify(body)}`);
  return body as T;
}

interface Question { q: string; options: string[]; answer_index?: number; explanation?: string }

async function main() {
  const titleLike = process.argv.find((a) => a.startsWith('--asset='))?.split('=')[1] ?? 'Antarctic daily sea ice extent';
  const grade = process.argv.find((a) => a.startsWith('--grade='))?.split('=')[1] ?? '9-10';
  const language = process.argv.find((a) => a.startsWith('--lang='))?.split('=')[1] ?? 'en';
  const { data: asset } = await db.from('assets').select('id, title').ilike('title', `%${titleLike}%`).eq('status', 'published').limit(1).single();
  if (!asset) throw new Error(`No published asset matching "${titleLike}"`);

  console.log(`▶ Generate lesson (Classes ${grade}, ${language}) from "${asset.title}"`);
  const t = Date.now();
  const { lesson, quiz } = await api<{ lesson: { id: string; title: string; content_md: string; learning_objectives: string[] }; quiz: { id: string; questions: Question[] } }>(
    '/api/education/lessons', { method: 'POST', body: JSON.stringify({ assetId: asset.id, gradeBand: grade, language }) });
  console.log(`  ${Math.round((Date.now() - t) / 1000)}s → "${lesson.title}", ${quiz.questions.length} questions`);
  console.log(`  objectives: ${lesson.learning_objectives.join(' | ').slice(0, 200)}`);
  console.log(`  lesson start: ${lesson.content_md.slice(0, 300).replace(/\n+/g, ' ¶ ')}`);
  console.log(`  Q1: ${quiz.questions[0].q} → ${quiz.questions[0].options.join(' / ')}`);
  const keyPositions = quiz.questions.map((q) => q.answer_index);
  console.log(`  answer key positions (should vary): ${keyPositions.join(',')}`);

  console.log('▶ Draft lesson is hidden from the public list');
  const before = await api<{ id: string }[]>('/api/education/lessons');
  console.log(`  in public list: ${before.some((l) => l.id === lesson.id)} (expected false)`);

  console.log('▶ Publish');
  await api(`/api/education/lessons/${lesson.id}`, { method: 'PATCH', body: JSON.stringify({ action: 'publish' }) });
  const list = await api<{ id: string; quiz_id: string }[]>('/api/education/lessons');
  console.log(`  in public list: ${list.some((l) => l.id === lesson.id)}, quiz_id present: ${!!list.find((l) => l.id === lesson.id)?.quiz_id}`);

  console.log('▶ Public lesson view must not leak the answer key');
  const pub = await api<{ quiz: { id: string; questions: Question[] } }>(`/api/education/lessons/${lesson.id}`);
  const leaked = pub.quiz.questions.some((q) => 'answer_index' in q || 'explanation' in q);
  console.log(`  answer key leaked: ${leaked} (expected false)`);
  if (leaked) throw new Error('Answer key visible to the public');

  console.log('▶ Wrong answers → no certificate');
  const wrong = quiz.questions.map((q) => ((q.answer_index ?? 0) + 1) % q.options.length);
  const failRes = await api<{ score: number; total: number; passed: boolean; certificate_id: string | null }>(`/api/education/quiz/${quiz.id}/submit`, {
    method: 'POST', body: JSON.stringify({ answers: wrong, user_name: 'Test Student', school: 'Test School' }) });
  console.log(`  ${failRes.score}/${failRes.total}, passed=${failRes.passed}, certificate=${failRes.certificate_id}`);

  console.log('▶ Correct answers → certificate');
  const right = quiz.questions.map((q) => q.answer_index ?? 0);
  const pass = await api<{ score: number; total: number; percent: number; passed: boolean; certificate_id: string; results: { explanation: string }[] }>(
    `/api/education/quiz/${quiz.id}/submit`, { method: 'POST', body: JSON.stringify({ answers: right, user_name: 'Test Student', school: 'Test School' }) });
  console.log(`  ${pass.score}/${pass.total} (${pass.percent}%), passed=${pass.passed}, certificate=${pass.certificate_id}`);
  console.log(`  explanation 1: ${pass.results[0].explanation}`);

  console.log('▶ Verify certificate');
  const cert = await api<Record<string, unknown>>(`/api/education/certificate/${pass.certificate_id}`);
  console.log(`  ${JSON.stringify(cert)}`);
  const bogus = await fetch(`${BASE}/api/education/certificate/DHRUV-2026-0000000000`);
  console.log(`  forged id → ${bogus.status} (expected 404)`);

  if (!KEEP) {
    await db.from('quiz_attempts').delete().eq('quiz_id', quiz.id);
    await db.from('lessons').delete().eq('id', lesson.id);
    console.log('Cleaned up test lesson.');
  } else {
    await db.from('quiz_attempts').delete().eq('quiz_id', quiz.id);
    console.log(`Kept lesson ${lesson.id} (published); removed test attempts.`);
  }
  console.log('\n✅ Learn flow passed');
}

main().catch((err) => {
  console.error('\n❌', err instanceof Error ? err.message : err);
  process.exit(1);
});
