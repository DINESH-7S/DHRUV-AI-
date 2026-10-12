import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { Check, X, ExternalLink } from 'lucide-react';
import questionsFile from '@/content/eval/questions.json';
import resultsFile from '@/content/eval/results.json';
import type { EvalFile, EvalQuestion, EvalResult, EvalRun } from '@/lib/eval/types';
import { formatDay } from '@/lib/utils';
import Markdown from '@/components/shared/Markdown';
import { PageBand } from '@/components/public/PageBand';

const QUESTIONS = (questionsFile as EvalFile).questions;
const RUNS = (resultsFile as { runs: EvalRun[] }).runs;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('accuracy');
  return { title: t('title'), description: t('intro').slice(0, 160) };
}

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

function Stat({ value, total, label, hint }: { value: number; total: number; label: string; hint: string }) {
  return (
    <div className="border-t border-[var(--line)] pt-4 space-y-1.5">
      <p className="font-display text-6xl sm:text-7xl font-bold leading-none tabular text-[var(--snow)]">
        {pct(value, total)}%<span className="ml-2 text-base font-normal text-[var(--mist)]">{value}/{total}</span>
      </p>
      <p className="font-medium text-[var(--snow)]">{label}</p>
      <p className="text-sm text-[var(--mist)] leading-relaxed">{hint}</p>
    </div>
  );
}

export default async function AccuracyPage() {
  const t = await getTranslations('accuracy');
  const hi = (await getLocale()) === 'hi';
  const run = RUNS[0];

  if (!run) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-24">
        <h1 className="text-4xl font-semibold">{t('title')}</h1>
        <p className="mt-4 text-[var(--mist)]">{t('none')}</p>
      </div>
    );
  }

  const results = new Map(run.results.map((r) => [r.id, r]));
  const asked = QUESTIONS.filter((q) => results.has(q.id));
  const date = (iso: string) => formatDay(iso, hi);
  const engine = run.open ? t('engineOpen', { model: run.model }) : t('engineHosted', { model: run.model });

  const why = (q: EvalQuestion, r: EvalResult) =>
    r.error ? t('whyError') : q.kind === 'refuse' ? t('whyAnswered') : !r.termsOk ? t('whyFacts') : t('whySource');

  const Row = ({ q }: { q: EvalQuestion }) => {
    const r = results.get(q.id)!;
    return (
      <li className="py-5 space-y-3">
        <div className="flex items-start gap-3">
          <span
            className={`mt-0.5 inline-flex items-center gap-1 shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${
              r.pass ? 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/30' : 'bg-rose-400/10 text-rose-300 border border-rose-400/30'
            }`}
          >
            {r.pass ? <Check className="w-3.5 h-3.5" aria-hidden /> : <X className="w-3.5 h-3.5" aria-hidden />}
            {r.pass ? t('pass') : t('fail')}
          </span>
          <div className="space-y-1 min-w-0">
            <p className="font-medium text-[var(--snow)]" lang={q.locale}>{q.q}</p>
            {!r.pass && <p className="text-sm text-rose-300">{why(q, r)}</p>}
            {!r.langOk && !r.error && <p className="text-sm text-amber-300">{t('langWrong')}</p>}
          </div>
        </div>
        <div className="sm:pl-[4.5rem] space-y-2 text-sm">
          <p className="text-[var(--mist)]" lang={q.locale}>
            <span className="text-[var(--snow)]/80">{t('checked')}:</span> {q.truth}
            {q.verified_at?.startsWith('http') && (
              <>
                {' '}
                <a href={q.verified_at} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[var(--glacier)] hover:underline">
                  {t('checkedAt')}
                  <ExternalLink className="w-3 h-3" aria-hidden />
                </a>
              </>
            )}
          </p>
          {r.answer && (
            <details className="group rounded-xl border border-[var(--line)] bg-[var(--navy-raised)]/60 px-4 py-3">
              <summary className="cursor-pointer text-[var(--glacier)] select-none">{t('dhruvSaid')}</summary>
              <div className="mt-3 text-[var(--snow)]/90" lang={q.locale}>
                <Markdown>{r.answer}</Markdown>
              </div>
              {r.citations.length > 0 && (
                <p className="mt-3 text-[var(--mist)]">
                  {t('cited')}:{' '}
                  {r.citations.map((c, i) => (
                    <React.Fragment key={c.href + i}>
                      {i > 0 && ' · '}
                      <Link href={c.href} className="text-[var(--glacier)] hover:underline">{c.title}</Link>
                    </React.Fragment>
                  ))}
                </p>
              )}
            </details>
          )}
        </div>
      </li>
    );
  };

  return (
    <>
    <PageBand eyebrow={t('eyebrow')} title={t('title')} subtitle={t('intro')}>
      <p className="micro-cap text-[var(--mist)] tabular">
        {t('lastRun', { date: date(run.at), engine, secs: (run.totals.medianMs / 1000).toFixed(1) })}
      </p>
    </PageBand>
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-16">

      <section className="grid gap-8 sm:grid-cols-3" aria-label={t('title')}>
        <Stat value={run.totals.factsPassed} total={run.totals.facts} label={t('statCorrect')} hint={t('statCorrectHint')} />
        <Stat value={run.totals.refusePassed} total={run.totals.refuse} label={t('statRefuse')} hint={t('statRefuseHint')} />
        <Stat value={run.totals.langOk} total={run.totals.questions} label={t('statLang')} hint={t('statLangHint')} />
      </section>

      <section className="space-y-3 border-t border-[var(--line)] pt-6">
        <h2 className="display text-3xl">{t('howTitle')}</h2>
        <ul className="list-disc pl-5 space-y-2 leading-relaxed text-[var(--snow)]/90 marker:text-[var(--glacier)]">
          {(['how1', 'how2', 'how3', 'how4'] as const).map((k) => <li key={k}>{t(k)}</li>)}
        </ul>
        {RUNS.length > 1 && (
          <div className="pt-3 space-y-1.5">
            <h3 className="font-medium">{t('history')}</h3>
            <ul className="text-sm text-[var(--mist)] space-y-1 tabular">
              {RUNS.slice(1).map((r) => (
                <li key={r.at}>
                  {t('historyRow', {
                    date: date(r.at),
                    label: r.label ? ` (${r.label})` : '',
                    facts: `${r.totals.factsPassed}/${r.totals.facts}`,
                    refuse: `${r.totals.refusePassed}/${r.totals.refuse}`,
                  })}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {(['fact', 'refuse'] as const).map((kind) => (
        <section key={kind} className="space-y-2">
          <h2 className="display text-3xl border-t border-[var(--line)] pt-8">
            {kind === 'fact' ? t('inArchive') : t('outArchive')}
          </h2>
          <ul className="divide-y divide-[var(--line)]">
            {asked.filter((q) => q.kind === kind).map((q) => <Row key={q.id} q={q} />)}
          </ul>
        </section>
      ))}
    </div>
    </>
  );
}
