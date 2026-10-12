import React from 'react';
import Link from 'next/link';
import { HelpCircle, MessageSquareText, Quote } from 'lucide-react';
import { loadInsights } from '@/lib/insights';
import { GapList } from './GapList';

export const dynamic = 'force-dynamic';

/**
 * "What India asks": what visitors ask Ask Dhruv, and which questions the archive could not
 * answer (no citation). Each gap can become a content brief for the outreach team.
 */
export default async function InsightsPage() {
  const data = await loadInsights(30);
  const answeredPct = data.total ? Math.round((data.answered / data.total) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="admin-head border-b border-[var(--line)] pb-6">
        <p className="eyebrow">Insight</p>
        <h1 className="mt-2 text-4xl sm:text-5xl text-[var(--snow)]">What India asks</h1>
        <p className="text-sm text-[var(--mist)] mt-3 max-w-3xl">
          Questions visitors asked Ask Dhruv in the last {data.days} days. A question counts as a gap when the answer could cite nothing from the
          archive. Turn a gap into a content brief, find the official source, upload it, and the next visitor gets an answer.
        </p>
      </div>

      <dl className="grid grid-cols-2 lg:grid-cols-4 border-y border-[var(--line)]">
        {[
          ['Questions asked', data.total],
          ['Answered with a source', `${answeredPct}%`],
          ['Gaps (no source)', data.gaps.reduce((n, g) => n + g.count, 0)],
          ['Different gap questions', data.gaps.length],
        ].map(([label, value], i) => (
          <div key={label} className={`py-5 px-4 ${i ? 'border-l border-[var(--line)]' : ''}`}>
            <dt className="text-xs text-[var(--mist)]">{label}</dt>
            <dd className="mt-1 text-3xl font-bold tabular text-[var(--snow)]">{value}</dd>
          </div>
        ))}
      </dl>

      <section className="space-y-3" aria-labelledby="gaps-h">
        <h2 id="gaps-h" className="micro-cap text-[var(--snow)] flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-amber-300" /> Questions the archive could not answer
        </h2>
        {data.gaps.length === 0 ? (
          <p className="glass-panel rounded-md p-8 text-center text-xs text-[var(--mist)]">
            Every question in the last {data.days} days was answered with a source. Ask something the archive does not cover on{' '}
            <Link href="/ask" className="text-[var(--glacier)] hover:underline">Ask Dhruv</Link> to see a gap appear here.
          </p>
        ) : (
          <GapList gaps={data.gaps} />
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="space-y-3" aria-labelledby="popular-h">
          <h2 id="popular-h" className="micro-cap text-[var(--snow)] flex items-center gap-2">
            <MessageSquareText className="w-4 h-4 text-[var(--glacier)]" /> Most asked
          </h2>
          <ol className="divide-y divide-slate-800 border-y border-[var(--line)]">
            {data.popular.map((q) => (
              <li key={q.question} className="flex items-start justify-between gap-4 py-2.5 text-xs">
                <span className="text-[var(--snow)]">{q.question}</span>
                <span className="tabular text-[var(--mist)] whitespace-nowrap">{q.count}×</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="space-y-3" aria-labelledby="cited-h">
          <h2 id="cited-h" className="micro-cap text-[var(--snow)] flex items-center gap-2">
            <Quote className="w-4 h-4 text-[var(--glacier)]" /> Most cited archive items
          </h2>
          <ol className="divide-y divide-slate-800 border-y border-[var(--line)]">
            {data.cited.map((c) => (
              <li key={c.id} className="flex items-start justify-between gap-4 py-2.5 text-xs">
                <Link href={`/asset/${c.id}`} className="text-[var(--snow)] hover:text-[var(--glacier)]">{c.title}</Link>
                <span className="tabular text-[var(--mist)] whitespace-nowrap">{c.count}×</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
