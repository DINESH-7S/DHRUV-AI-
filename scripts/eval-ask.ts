/**
 * Accuracy scorecard for Ask Dhruv: runs the fixed question set in content/eval/questions.json
 * through the same code path as the public Ask page (anonymous, RLS-bound client) and grades
 * each answer automatically. Results are appended to content/eval/results.json, which the
 * public /accuracy page renders.
 *   npm run eval-ask                          (default engine from .env.local)
 *   npm run eval-ask -- --label "after X"     (name the run)
 *   npm run eval-ask -- --only hi             (one language; not saved as a full run)
 *   $env:AI_PROVIDER = "ollama"; npm run eval-ask   (sovereign mode)
 *
 * Grading is deliberately simple and strict so anyone can check it:
 * - a factual question passes when the answer contains every required term AND cites one of
 *   the archive items that hold the fact;
 * - an out-of-archive question passes when Dhruv says it has no information and does not
 *   give the outside answer.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'node:fs';
import { answerQuestion } from '../lib/ai/chat';
import { aiProvider, modelName } from '../lib/ai/llm';
import { isRefusal, langOk, matchesAll, mentionsAny } from '../lib/eval/grade';
import type { EvalFile, EvalQuestion, EvalResult, EvalRun } from '../lib/eval/types';

const QUESTIONS = 'content/eval/questions.json';
const RESULTS = 'content/eval/results.json';
const SUMMARY = 'content/eval/summary.json';
const KEEP_RUNS = 10;
/** Free-tier quotas are per minute: space the questions out. */
const PAUSE_MS = Number(process.env.EVAL_PAUSE_MS ?? 4000);

const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
  auth: { persistSession: false },
});

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};

async function grade(q: EvalQuestion): Promise<EvalResult> {
  const started = Date.now();
  try {
    const a = await answerQuestion(anon, q.q, q.locale, { input: 0, output: 0 });
    const cited = a.citations.map((c) => (c.asset_id ? c.asset_id.slice(0, 8) : c.href.startsWith('/expeditions') ? 'expeditions' : 'directory'));
    const refused = isRefusal(a.answer) || a.citations.length === 0;
    const termsOk = q.kind === 'fact' ? matchesAll(a.answer, q.must ?? []) : false;
    const sourceOk = q.kind === 'fact' ? (q.sources ?? []).some((s) => cited.includes(s)) : false;
    const forbidden = q.kind === 'refuse' && mentionsAny(a.answer, q.forbid ?? []);
    const pass = q.kind === 'fact' ? termsOk && sourceOk : refused && !forbidden;
    return {
      id: q.id,
      pass,
      termsOk,
      sourceOk,
      refused,
      langOk: langOk(a.answer, q.locale),
      ms: Date.now() - started,
      answer: a.answer,
      citations: a.citations.map(({ asset_id, title, href }) => ({ asset_id, title, href })),
      model: a.engine?.model ?? null,
    };
  } catch (e) {
    return {
      id: q.id,
      pass: false,
      termsOk: false,
      sourceOk: false,
      refused: false,
      langOk: false,
      ms: Date.now() - started,
      answer: '',
      citations: [],
      model: null,
      error: e instanceof Error ? e.message.slice(0, 300) : String(e),
    };
  }
}

async function main() {
  const file = JSON.parse(readFileSync(QUESTIONS, 'utf8')) as EvalFile;
  const only = arg('only');
  const questions = file.questions.filter((q) => !only || q.locale === only || q.id === only);
  console.log(`Ask Dhruv scorecard · ${questions.length} questions · engine ${aiProvider()} (${modelName('fast')})\n`);

  const results: EvalResult[] = [];
  for (const [i, q] of questions.entries()) {
    if (i) await new Promise((r) => setTimeout(r, PAUSE_MS));
    const r = await grade(q);
    results.push(r);
    const why = r.error
      ? `error: ${r.error}`
      : q.kind === 'fact'
        ? `${r.termsOk ? 'facts ✓' : 'facts ✗'} ${r.sourceOk ? 'source ✓' : 'source ✗'}`
        : r.refused
          ? 'said not in archive'
          : 'answered anyway';
    console.log(`${r.pass ? '✓' : '✗'} [${q.locale}] ${q.id.padEnd(20)} ${(r.ms / 1000).toFixed(1).padStart(5)} s · ${why}${r.langOk ? '' : ' · wrong language'}`);
    if (!r.pass && !r.error) console.log(`    ${r.answer.replace(/\s+/g, ' ').slice(0, 220)}`);
  }

  const facts = questions.filter((q) => q.kind === 'fact').map((q) => q.id);
  const byId = new Map(results.map((r) => [r.id, r]));
  const run: EvalRun = {
    at: new Date().toISOString(),
    label: arg('label') ?? null,
    provider: aiProvider(),
    open: aiProvider() === 'ollama',
    model: results.find((r) => r.model)?.model ?? modelName('fast'),
    totals: {
      questions: results.length,
      passed: results.filter((r) => r.pass).length,
      facts: facts.length,
      factsPassed: facts.filter((id) => byId.get(id)?.pass).length,
      refuse: results.length - facts.length,
      refusePassed: results.filter((r) => r.pass && !facts.includes(r.id)).length,
      langOk: results.filter((r) => r.langOk).length,
      medianMs: [...results].sort((a, b) => a.ms - b.ms)[Math.floor(results.length / 2)]?.ms ?? 0,
    },
    results,
  };
  const t = run.totals;
  console.log(
    `\nCorrect with the right source: ${t.factsPassed}/${t.facts} · said "not in archive" when it should: ${t.refusePassed}/${t.refuse} · right language: ${t.langOk}/${t.questions} · median ${(t.medianMs / 1000).toFixed(1)} s`,
  );

  if (only) {
    console.log('(Partial run: not saved.)');
    return;
  }
  let saved: { runs: EvalRun[] } = { runs: [] };
  try {
    saved = JSON.parse(readFileSync(RESULTS, 'utf8'));
  } catch {
    // First run.
  }
  saved.runs = [run, ...saved.runs].slice(0, KEEP_RUNS);
  writeFileSync(RESULTS, JSON.stringify(saved, null, 2) + '\n');
  // Small summary for the Ask page's trust strip (the full results are too large to ship to the browser).
  writeFileSync(SUMMARY, JSON.stringify({ at: run.at, model: run.model, open: run.open, totals: run.totals }, null, 2) + '\n');
  console.log(`Saved to ${RESULTS}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
