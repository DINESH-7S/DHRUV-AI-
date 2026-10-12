/**
 * Saves real Ask Dhruv answers for the sample questions on the Ask page (messages ask.q1-q5, in
 * English and Hindi, each answered in both languages) to content/ask/saved.json. The live page
 * serves these instantly and labels them as saved (lib/ai/saved-answers.ts).
 *   npm run save-answers
 * Same code path as the public page: anonymous, RLS-bound client. An answer that finds no source
 * is not saved, so that question falls back to the live AI. Re-run after the archive changes.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'node:fs';
import { answerQuestion } from '../lib/ai/chat';
import type { SavedAnswer } from '../lib/ai/saved-answers';

const FILE = 'content/ask/saved.json';
const KEYS = ['q1', 'q2', 'q3', 'q4', 'q5'];
/** The free embedding tier allows about 3 requests a minute. */
const PAUSE_MS = Number(process.env.SAVE_PAUSE_MS ?? 20_000);

const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
  auth: { persistSession: false },
});
const messages = {
  en: JSON.parse(readFileSync('messages/en.json', 'utf8')).ask,
  hi: JSON.parse(readFileSync('messages/hi.json', 'utf8')).ask,
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const file = JSON.parse(readFileSync(FILE, 'utf8')) as { note: string; answers: SavedAnswer[] };
  const kept = new Map(file.answers.map((a) => [`${a.locale}|${a.question}`, a]));
  const jobs = KEYS.flatMap((k) =>
    (['en', 'hi'] as const).flatMap((qLang) => (['en', 'hi'] as const).map((locale) => ({ question: messages[qLang][k] as string, locale }))),
  );

  let saved = 0;
  for (const [i, { question, locale }] of jobs.entries()) {
    if (i > 0) await sleep(PAUSE_MS);
    try {
      const a = await answerQuestion(anon, question, locale, { input: 0, output: 0 });
      if (!a.citations.length || !a.engine) {
        console.log(`✗ ${locale} · ${question} → no source found, left to the live AI`);
        continue;
      }
      kept.set(`${locale}|${question}`, { question, locale, answer: a.answer, citations: a.citations, engine: a.engine, at: new Date().toISOString() });
      saved++;
      console.log(`✓ ${locale} · ${question} → ${a.citations.length} sources`);
      // Write as we go, so a quota error halfway keeps what worked.
      writeFileSync(FILE, JSON.stringify({ note: file.note, answers: [...kept.values()] }, null, 2) + '\n');
    } catch (err) {
      console.log(`✗ ${locale} · ${question} → ${err instanceof Error ? err.message : err}`);
    }
  }
  console.log(`\nSaved ${saved} of ${jobs.length} answers to ${FILE}.`);
}

main();
