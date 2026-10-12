"use client";

import React, { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ArrowUp, Check, Copy, RotateCcw, ShieldCheck, Quote, FlaskConical, Plus } from 'lucide-react';
import { EASE } from '@/components/motion/Reveal';
import { PolarGraticule } from '@/components/graphics/PolarGraticule';
import { AnswerReveal } from '@/components/ask/AnswerReveal';
import { ThinkingStages } from '@/components/ask/ThinkingStages';
import { SourceCards, type Citation } from '@/components/ask/SourceCards';
import summary from '@/content/eval/summary.json';

interface Exchange {
  id: string;
  question: string;
  locale: 'en' | 'hi';
  answer?: string;
  citations?: Citation[];
  engine?: { model: string; open: boolean };
  /** Set when the answer is a saved one (the sample questions): when it was made. */
  saved?: { at: string };
  error?: string;
  /** The AI service could not answer: offer the sample questions, which always work. */
  busy?: boolean;
  time?: string;
  /** Older answers render instantly; only the newest one is revealed. */
  animate: boolean;
}

// Each of these is answered from the seeded archive (verified against /api/chat).
const SUGGESTED_KEYS = ['q1', 'q2', 'q3', 'q4', 'q5'] as const;

const clock = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/** "[2]" in the answer becomes a chip linking to source card 2 of this answer. */
const linkCitations = (text: string, id: string, citations: Citation[]) => {
  const known = new Set(citations.map((c) => c.n));
  return text.replace(/\[(\d+)\]/g, (m, n) => (known.has(Number(n)) ? `[${n}](#src-${id}-${n})` : m));
};

export default function AskDhruvPage() {
  return (
    // Reserve a screen of height while the client renders, so the footer never flashes into view (CLS).
    <Suspense fallback={<div className="min-h-[100dvh] bg-[var(--ink)]" />}>
      <AskDhruv />
    </Suspense>
  );
}

function AskDhruv() {
  const t = useTranslations('ask');
  const tAcc = useTranslations('accuracy');
  const searchParams = useSearchParams();
  const askedFromUrl = useRef(false);
  const siteLocale = useLocale();
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [locale, setLocale] = useState<'en' | 'hi'>(siteLocale === 'hi' ? 'hi' : 'en');
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Keep the newest exchange in view.
  useEffect(() => {
    if (exchanges.length) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [exchanges.length, loading]);

  // /ask?q=... (e.g. from the home page) asks the question straight away, once.
  useEffect(() => {
    const q = searchParams.get('q');
    if (q && !askedFromUrl.current) {
      askedFromUrl.current = true;
      ask(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const ask = async (text: string, { live = false } = {}) => {
    const question = text.trim();
    if (!question || loading) return;
    const id = `x${Date.now()}`;
    setExchanges((prev) => [...prev.map((e) => ({ ...e, animate: false })), { id, question, locale, animate: true }]);
    setDraft('');
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, locale, live }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setExchanges((prev) => prev.map((e) => (e.id === id ? { ...e, error: data.error || t('error'), busy: !!data.busy, time: clock() } : e)));
        return;
      }
      setExchanges((prev) =>
        prev.map((e) => (e.id === id ? { ...e, answer: data.answer, citations: data.citations ?? [], engine: data.engine, saved: data.saved, time: clock() } : e)),
      );
    } catch {
      setExchanges((prev) => prev.map((e) => (e.id === id ? { ...e, error: t('error'), busy: true, time: clock() } : e)));
    } finally {
      setLoading(false);
    }
  };

  const copy = async (e: Exchange) => {
    try {
      await navigator.clipboard.writeText(e.answer ?? '');
      setCopied(e.id);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      // Clipboard blocked: nothing to do.
    }
  };

  const labels = {
    video: t('kindVideo'),
    page: t('kindPage'),
    timeline: t('kindTimeline'),
    directory: t('kindDirectory'),
    item: t('kindItem'),
  };
  const tot = summary.totals;

  return (
    <div className="relative">
      {exchanges.length === 0 ? (
        /* ---------------- Empty state: the opening ---------------- */
        <section className="relative isolate -mt-16 overflow-hidden border-b border-[var(--line)] bg-[var(--ink)]">
          <div aria-hidden className="absolute -z-10 left-1/2 top-[46%] w-[58rem] max-w-none -translate-x-[20%] -translate-y-1/2 opacity-70 sm:-translate-x-[8%]">
            <PolarGraticule className="w-full h-auto" />
          </div>
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-[var(--ink)] via-[var(--ink)]/85 to-transparent" />

          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 sm:pt-40 pb-16 grid gap-14 lg:grid-cols-[1.05fr_1fr] lg:items-end">
            <div className="space-y-6">
              <p style={{ '--i': 0 } as React.CSSProperties} className="rise eyebrow">{t('kicker')}</p>
              <h1 style={{ '--i': 1 } as React.CSSProperties} className="rise text-6xl sm:text-8xl leading-[0.9] text-[var(--snow)]">
                {t('heroTitle')}
              </h1>
              <p style={{ '--i': 2 } as React.CSSProperties} className="rise text-lg text-[var(--snow)]/80 leading-relaxed max-w-[52ch]">
                {t('subtitle')}
              </p>
              <ul style={{ '--i': 3 } as React.CSSProperties} className="rise grid gap-3 pt-2 text-sm text-[var(--snow)]/85">
                <li className="flex items-center gap-3"><ShieldCheck className="h-4 w-4 text-[var(--glacier)]" aria-hidden /> {t('trustArchive')}</li>
                <li className="flex items-center gap-3"><Quote className="h-4 w-4 text-[var(--glacier)]" aria-hidden /> {t('trustCited')}</li>
                <li className="flex items-center gap-3">
                  <FlaskConical className="h-4 w-4 text-[var(--glacier)]" aria-hidden />
                  <span>
                    {t('trustTested', { passed: tot.factsPassed, total: tot.facts })}{' '}
                    <Link href="/accuracy" className="text-[var(--glacier)] underline-offset-2 hover:underline">{tAcc('askLink')}</Link>
                  </span>
                </li>
              </ul>
            </div>

            {/* Suggested questions: rows that slide in one after another */}
            <div className="space-y-3">
              <p className="micro-cap text-[var(--mist)]">{t('suggested')}</p>
              <motion.ul
                initial="hidden"
                animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.35 } } }}
                className="divide-y divide-[var(--line)] border-y border-[var(--line)]"
              >
                {SUGGESTED_KEYS.map((key) => (
                  <motion.li key={key} variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } } }}>
                    <button
                      onClick={() => ask(t(key))}
                      className="group flex w-full items-center justify-between gap-4 py-4 text-left text-[var(--snow)] transition-colors duration-500 hover:text-[var(--glacier)]"
                    >
                      <span className="text-base leading-snug">{t(key)}</span>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--line)] transition-[transform,border-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1 group-hover:border-[var(--glacier)]">
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                      </span>
                    </button>
                  </motion.li>
                ))}
              </motion.ul>
            </div>
          </div>
        </section>
      ) : (
        /* ---------------- Conversation ---------------- */
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-12 pb-12 space-y-16">
          <h1 className="sr-only">{t('title')}</h1>
          {exchanges.map((e) => (
            <motion.article
              key={e.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
              className="space-y-6"
              aria-busy={!e.answer && !e.error}
            >
              <header className="space-y-2 border-l-2 border-[var(--glacier)] pl-5">
                <p className="micro-cap text-[var(--mist)]">{t('youAsked')}</p>
                <h2 className="font-display text-2xl sm:text-3xl font-bold leading-tight text-[var(--snow)]" lang={/[ऀ-ॿ]/.test(e.question) ? 'hi' : undefined}>
                  {e.question}
                </h2>
              </header>

              <div className="space-y-5 pl-5">
                <p className="micro-cap flex items-center gap-2 text-[var(--glacier)]">
                  <span className="relative flex h-2 w-2" aria-hidden>
                    {!e.answer && !e.error && <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--glacier)] opacity-60 motion-safe:animate-ping" />}
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--glacier)]" />
                  </span>
                  {t('dhruvLabel')}
                </p>

                {e.error ? (
                  <div className="space-y-4">
                    <p role="alert" className="rounded-md border border-amber-300/30 bg-amber-300/[0.07] p-4 text-sm leading-relaxed text-amber-100">{e.error}</p>
                    {e.busy && (
                      <div className="space-y-2">
                        <p className="micro-cap text-[var(--mist)]">{t('busySamples')}</p>
                        <div className="flex flex-wrap gap-2">
                          {SUGGESTED_KEYS.map((key) => (
                            <button key={key} onClick={() => ask(t(key))} disabled={loading} className="chip text-left disabled:opacity-40">
                              {t(key)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : e.answer === undefined ? (
                  <ThinkingStages labels={[t('stage1'), t('stage2'), t('stage3')]} />
                ) : (
                  <>
                    <AnswerReveal text={linkCitations(e.answer, e.id, e.citations ?? [])} lang={e.locale === 'hi' ? 'hi' : undefined} />


                    {!!e.citations?.length && (
                      <section aria-label={t('sources')} className="space-y-3">
                        <p className="micro-cap text-[var(--mist)]">{t('sourcesCount', { count: e.citations.length })}</p>
                        <SourceCards messageId={e.id} citations={e.citations} labels={labels} />
                      </section>
                    )}

                    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => copy(e)} className="micro-cap inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[var(--mist)] transition-colors hover:bg-white/5 hover:text-[var(--snow)]">
                          {copied === e.id ? <Check className="h-3.5 w-3.5 text-emerald-300" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
                          {copied === e.id ? t('copied') : t('copy')}
                        </button>
                        <button onClick={() => ask(e.question, { live: !!e.saved })} disabled={loading} className="micro-cap inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[var(--mist)] transition-colors hover:bg-white/5 hover:text-[var(--snow)] disabled:opacity-40">
                          <RotateCcw className="h-3.5 w-3.5" aria-hidden /> {e.saved ? t('askLive') : t('regenerate')}
                        </button>
                      </div>
                      <p className="text-[11px] text-[var(--mist)] font-mono tabular" title={e.saved ? t('savedHint') : e.engine?.open ? t('engineOpenHint') : t('engineHostedHint')}>
                        {e.saved && e.engine
                          ? t('savedLabel', { model: e.engine.model, date: new Date(e.saved.at).toLocaleDateString(e.locale === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short' }) })
                          : e.engine && (e.engine.open ? t('engineOpen', { model: e.engine.model }) : t('engineHosted', { model: e.engine.model }))}{' '}
                        · {e.time}
                      </p>
                    </footer>
                    <p className="text-xs text-[var(--mist)]">{t('aiNote')}</p>
                  </>
                )}
              </div>
            </motion.article>
          ))}
          <div ref={endRef} />
        </div>
      )}

      {/* ---------------- Dock: the question box ---------------- */}
      <div className="sticky bottom-0 z-30 pb-4 pt-8 bg-gradient-to-t from-[var(--navy)] via-[var(--navy)]/95 to-transparent">
        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            ask(draft);
          }}
          className="max-w-3xl mx-auto px-4 sm:px-6"
        >
          <div className="rounded-lg border border-[var(--line)] bg-[var(--navy-raised)] p-2 shadow-[0_30px_60px_-30px_rgba(1,6,12,0.95)] transition-colors duration-300 focus-within:border-[var(--glacier)]/70">
            <textarea
              ref={inputRef}
              rows={1}
              value={draft}
              onChange={(ev) => {
                setDraft(ev.target.value);
                ev.target.style.height = 'auto';
                ev.target.style.height = `${Math.min(ev.target.scrollHeight, 160)}px`;
              }}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter' && !ev.shiftKey) {
                  ev.preventDefault();
                  ask(draft);
                }
              }}
              placeholder={t('placeholder')}
              aria-label={t('placeholder')}
              className="block w-full resize-none bg-transparent px-3 pt-2.5 pb-1 text-base text-[var(--snow)] placeholder-[var(--mist)] focus:outline-none"
            />
            <div className="flex items-center justify-between gap-2 px-1 pt-1">
              <div className="flex items-center gap-2">
                {/* Answer language (defaults to the site language) */}
                <div role="group" aria-label={t('answerLanguage')} className="relative flex rounded-full border border-[var(--line)] p-0.5">
                  {(['en', 'hi'] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLocale(l)}
                      aria-pressed={locale === l}
                      className={`relative z-10 rounded-full px-3 py-1 text-xs font-medium transition-colors duration-300 ${locale === l ? 'text-[var(--ink)]' : 'text-[var(--mist)] hover:text-[var(--snow)]'}`}
                    >
                      {locale === l && (
                        <motion.span layoutId="ask-lang" transition={{ type: 'spring', stiffness: 420, damping: 34 }} className="absolute inset-0 -z-10 rounded-full bg-[var(--snow)]" />
                      )}
                      {l === 'en' ? 'English' : 'हिन्दी'}
                    </button>
                  ))}
                </div>
                {exchanges.length > 0 && (
                  <button type="button" onClick={() => setExchanges([])} disabled={loading} className="micro-cap hidden sm:inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[var(--mist)] hover:text-[var(--snow)] disabled:opacity-40">
                    <Plus className="h-3.5 w-3.5" aria-hidden /> {t('newChat')}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline text-[11px] text-[var(--mist)]">{t('hint')}</span>
                <motion.button
                  type="submit"
                  whileTap={{ scale: 0.92 }}
                  disabled={loading || !draft.trim()}
                  aria-label={t('send')}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--snow)] text-[var(--ink)] transition-opacity disabled:opacity-30"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {loading ? (
                      <motion.span key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-4 w-4 rounded-full border-2 border-[var(--ink)]/30 border-t-[var(--ink)] animate-spin" />
                    ) : (
                      <motion.span key="a" initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -6, opacity: 0 }}>
                        <ArrowUp className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
