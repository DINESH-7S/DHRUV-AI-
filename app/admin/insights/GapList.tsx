"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Sparkles, Upload } from 'lucide-react';
import type { GapQuestion } from '@/lib/insights';
import type { ContentBrief } from '@/lib/ai/brief';

/** Gap questions, each with a one-click AI content brief (a plan, never an answer). */
export function GapList({ gaps }: { gaps: GapQuestion[] }) {
  const [briefs, setBriefs] = useState<Record<string, ContentBrief>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const draft = async (question: string) => {
    setBusy(question);
    setErrors((e) => ({ ...e, [question]: '' }));
    try {
      const res = await fetch('/api/insights/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: [question] }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Could not draft a brief.');
      setBriefs((b) => ({ ...b, [question]: body }));
    } catch (err) {
      setErrors((e) => ({ ...e, [question]: err instanceof Error ? err.message : 'Could not draft a brief.' }));
    } finally {
      setBusy(null);
    }
  };

  return (
    <ul className="space-y-3">
      {gaps.map((g) => {
        const brief = briefs[g.question];
        return (
          <li key={g.question} className="glass-panel rounded-2xl border border-[var(--line)] p-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--snow)]" lang={g.hindi ? 'hi' : undefined}>{g.question}</p>
                <p className="text-[11px] text-[var(--mist)] tabular">
                  Asked {g.count}× · last {new Date(g.lastAsked).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  {g.hindi ? ' · Hindi' : ''}
                </p>
              </div>
              {!brief && (
                <button
                  onClick={() => draft(g.question)}
                  disabled={busy !== null}
                  className="px-3 py-1.5 rounded-lg bg-[var(--glacier)]/15 text-[var(--glacier)] border border-[var(--glacier)]/40 text-xs font-bold hover:bg-[var(--glacier)]/25 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {busy === g.question ? 'Drafting…' : 'Draft a content brief'}
                </button>
              )}
            </div>
            {errors[g.question] && <p className="text-[11px] text-rose-300">{errors[g.question]}</p>}
            {brief && (
              <div className="border-t border-[var(--line)] pt-3 grid gap-4 md:grid-cols-2 text-xs">
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--mist)] font-bold">Suggested explainer</p>
                  <p className="text-sm font-semibold text-[var(--snow)]">{brief.title}</p>
                  <p className="text-sm text-[var(--glacier)]/80" lang="hi">{brief.title_hi}</p>
                  <p className="text-[var(--snow)]/80">{brief.why}</p>
                  <p className="text-[var(--mist)]">Format: {brief.formats.join(', ')}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--mist)] font-bold">It must answer</p>
                  <ul className="list-disc pl-4 space-y-1 text-[var(--snow)]/80">
                    {brief.must_answer.map((q) => <li key={q}>{q}</li>)}
                  </ul>
                  <p className="text-[10px] uppercase tracking-wider text-[var(--mist)] font-bold pt-1">Where to find the facts</p>
                  <ul className="space-y-1">
                    {brief.sources.map((s) => (
                      <li key={s.url}>
                        <a href={s.url} target={s.url.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="text-[var(--glacier)] hover:underline inline-flex items-center gap-1">
                          {s.name} <ExternalLink className="w-3 h-3" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="md:col-span-2 text-[11px] text-[var(--mist)] flex flex-wrap items-center gap-2">
                  The brief only plans the explainer; it states no facts. Upload the official source you find, and Ask Dhruv can answer from it.
                  <Link href="/admin/upload" className="inline-flex items-center gap-1 text-[var(--glacier)] hover:underline">
                    <Upload className="w-3 h-3" /> Upload a source
                  </Link>
                </p>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
