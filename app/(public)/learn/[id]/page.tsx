"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, ArrowRight, Award, Check, X } from 'lucide-react';
import Markdown from '@/components/shared/Markdown';
import { ReadingProgress } from '@/components/motion/ReadingProgress';
import { motion } from 'framer-motion';
import { CountUp } from '@/components/motion/CountUp';
import { EASE } from '@/components/motion/Reveal';

/** One celebratory burst when a student passes (loaded on demand; skipped for reduced motion). */
async function celebrate() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const confetti = (await import('canvas-confetti')).default;
  const colors = ['#5bbfe6', '#eef5fa', '#a7e3f7', '#e8c07d'];
  confetti({ particleCount: 90, spread: 70, startVelocity: 42, origin: { y: 0.7 }, colors, disableForReducedMotion: true });
  setTimeout(() => confetti({ particleCount: 60, spread: 100, origin: { y: 0.6 }, colors, disableForReducedMotion: true }), 250);
}

interface QuizQuestion {
  q: string;
  options: string[];
}

interface LessonData {
  lesson: {
    id: string;
    asset_id: string;
    title: string;
    grade_band: string;
    language: string;
    content_md: string;
    learning_objectives: string[];
  };
  quiz: {
    id: string;
    questions: QuizQuestion[];
  } | null;
}

interface QuizSubmissionResult {
  score: number;
  total: number;
  percent: number;
  passed: boolean;
  certificate_id: string | null;
  results: {
    correct: boolean;
    answer_index: number;
    explanation: string;
  }[];
}

export default function LessonDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const t = useTranslations('lesson');
  const tLearn = useTranslations('learn');

  const [data, setData] = useState<LessonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Student quiz form state
  const [userName, setUserName] = useState('');
  const [school, setSchool] = useState('');
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<QuizSubmissionResult | null>(null);

  useEffect(() => {
    async function loadLesson() {
      if (!id) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/education/lessons/${id}`);
        if (!res.ok) throw new Error();
        const lessonRes: LessonData = await res.json();
        setData(lessonRes);
        setAnswers(new Array(lessonRes.quiz?.questions.length ?? 0).fill(-1));
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    }
    loadLesson();
  }, [id]);

  const handleOptionSelect = (qIdx: number, oIdx: number) => {
    // Functional update: rapid taps must not overwrite each other with a stale copy.
    setAnswers(prev => prev.map((a, i) => (i === qIdx ? oIdx : a)));
    setFormError(null);
  };

  const handleQuizSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.quiz) return;
    if (!userName.trim()) return setFormError(t('needDetails'));
    if (answers.includes(-1)) return setFormError(t('needAnswers'));

    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/education/quiz/${data.quiz.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, user_name: userName, school }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error);
      setResult(body);
      if (body.passed) celebrate();
      requestAnimationFrame(() => document.getElementById('quiz-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch (err) {
      setFormError(err instanceof Error && err.message ? err.message : t('failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const retry = () => {
    setResult(null);
    setAnswers(new Array(data?.quiz?.questions.length ?? 0).fill(-1));
    document.getElementById('quiz')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 pt-14 space-y-5 animate-pulse" aria-busy="true">
        <div className="h-4 w-32 rounded bg-white/5" />
        <div className="h-12 w-3/4 rounded bg-white/5" />
        <div className="h-40 rounded-2xl bg-white/5" />
        <span className="sr-only">{t('loading')}</span>
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center space-y-4">
        <p className="text-lg text-rose-200">{t('notFound')}</p>
        <Link href="/learn" className="inline-flex items-center gap-1.5 text-[var(--glacier)] rounded-md">
          <ArrowLeft className="w-4 h-4" /> {t('back')}
        </Link>
      </div>
    );
  }

  const { lesson, quiz } = data;
  const answeredCount = answers.filter(a => a !== -1).length;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-10 pb-24 space-y-12">
      <ReadingProgress />
      <Link href="/learn" className="micro-cap inline-flex items-center gap-1.5 text-[var(--mist)] hover:text-[var(--snow)] rounded-md">
        <ArrowLeft className="w-4 h-4" /> {t('back')}
      </Link>

      {/* Lesson header */}
      <header className="space-y-5" lang={lesson.language}>
        <div className="flex items-center gap-2.5 text-xs">
          <span className="px-2.5 py-0.5 rounded-full font-semibold bg-[var(--glacier)]/10 text-[var(--glacier)] border border-[var(--glacier)]/25">
            {tLearn('grade', { grade: lesson.grade_band })}
          </span>
          <span className="text-[var(--mist)]">
            {lesson.language === 'hi' ? 'हिन्दी' : 'English'}
          </span>
        </div>
        <h1 className="rise normal-case tracking-normal font-display text-4xl sm:text-6xl font-bold leading-[1.02]">{lesson.title}</h1>

        {lesson.learning_objectives?.length > 0 && (
          <section className="rounded-2xl border border-[var(--line)] bg-[var(--navy-raised)] p-5 sm:p-6">
            <h2 className="text-base font-semibold mb-3">{t('objectives')}</h2>
            <ul className="space-y-2">
              {lesson.learning_objectives.map((obj, i) => (
                <li key={i} className="flex gap-3 text-[var(--mist)] leading-relaxed">
                  <Check className="w-4 h-4 mt-1 shrink-0 text-[var(--glacier)]" />
                  <span>{obj}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </header>

      {/* Lesson body */}
      <article lang={lesson.language} className="[&_p]:text-base [&_p]:leading-8 [&_li]:text-base [&_h2]:text-2xl [&_h2]:mt-10">
        <Markdown>{lesson.content_md}</Markdown>
      </article>

      {/* Quiz */}
      {quiz && (
        <section id="quiz" className="scroll-mt-24 rounded-3xl border border-[var(--line)] bg-[var(--navy-raised)] p-6 sm:p-8 space-y-8">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <h2 className="display text-3xl sm:text-4xl">{t('quizTitle')}</h2>
              <p className="text-[var(--mist)]">{t('quizSubtitle')}</p>
            </div>
            <Award className="w-8 h-8 shrink-0 text-[var(--glacier)]" />
          </div>

          {!result ? (
            <form onSubmit={handleQuizSubmit} noValidate className="space-y-8">
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="space-y-1.5">
                  <span className="text-sm font-medium">{t('name')}</span>
                  <input
                    type="text"
                    required
                    autoComplete="name"
                    value={userName}
                    onChange={e => { setUserName(e.target.value); setFormError(null); }}
                    placeholder={t('namePlaceholder')}
                    className="w-full rounded-xl border border-[var(--line)] bg-[var(--ink)] px-3.5 py-2.5 text-[var(--snow)] placeholder:text-[var(--mist)] focus:border-[var(--glacier)] focus:outline-none"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-sm font-medium">{t('school')}</span>
                  <input
                    type="text"
                    autoComplete="organization"
                    value={school}
                    onChange={e => { setSchool(e.target.value); setFormError(null); }}
                    placeholder={t('schoolPlaceholder')}
                    className="w-full rounded-xl border border-[var(--line)] bg-[var(--ink)] px-3.5 py-2.5 text-[var(--snow)] placeholder:text-[var(--mist)] focus:border-[var(--glacier)] focus:outline-none"
                  />
                </label>
              </div>

              <p className="text-sm text-[var(--mist)]">{t('privacyNote')}</p>

              <ol className="space-y-8" lang={lesson.language}>
                {quiz.questions.map((q, qIdx) => (
                  <li key={qIdx} className="space-y-3">
                    <p id={`q-${qIdx}`} className="font-semibold leading-relaxed">
                      <span className="font-mono text-sm text-[var(--glacier)] mr-2">{String(qIdx + 1).padStart(2, '0')}</span>
                      {q.q}
                    </p>
                    <div role="radiogroup" aria-labelledby={`q-${qIdx}`} className="grid gap-2">
                      {q.options.map((opt, oIdx) => {
                        const checked = answers[qIdx] === oIdx;
                        return (
                          <button
                            key={oIdx}
                            type="button"
                            role="radio"
                            aria-checked={checked}
                            onClick={() => handleOptionSelect(qIdx, oIdx)}
                            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border text-left ${checked ? 'border-[var(--glacier)] bg-[var(--glacier)]/10 text-[var(--snow)]' : 'border-[var(--line)] text-[var(--snow)]/80 hover:border-[var(--line)]'}`}
                          >
                            <span className={`flex items-center justify-center w-5 h-5 shrink-0 rounded-full border transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${checked ? 'scale-110 border-[var(--glacier)] bg-[var(--glacier)]' : 'border-[var(--line)]'}`}>
                              {checked && <Check className="w-3 h-3 text-[#06121e]" strokeWidth={3} />}
                            </span>
                            <span>{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  </li>
                ))}
              </ol>

              {formError && (
                <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/5 px-4 py-3 text-rose-200">{formError}</p>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <span className="font-mono text-sm text-[var(--mist)] tabular">
                  {answeredCount} / {quiz.questions.length}
                </span>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[var(--glacier)] text-[#06121e] font-semibold hover:bg-[#7fd0ef] disabled:opacity-60"
                >
                  {submitting ? t('submitting') : t('submit')}
                  {!submitting && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </form>
          ) : (
            <motion.div
              id="quiz-result"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE }}
              className="scroll-mt-24 space-y-8"
            >
              <div className={`rounded-2xl p-6 border ${result.passed ? 'border-emerald-400/30 bg-emerald-400/5' : 'border-amber-400/30 bg-amber-500/5'}`}>
                <p className="text-sm text-[var(--mist)]">{t('score')}</p>
                <p className="font-display text-5xl font-semibold tabular mt-1">
                  <CountUp value={result.score} duration={1} />/{result.total}{' '}
                  <span className="text-2xl text-[var(--mist)]">({result.percent}%)</span>
                </p>
                <p className="mt-3 font-medium">{result.passed ? t('passed') : t('failed')}</p>
                <p className="text-sm text-[var(--mist)] mt-1">{result.passed ? t('passedDetail') : t('failedDetail')}</p>

                <div className="mt-5 flex flex-wrap gap-3">
                  {result.passed && result.certificate_id ? (
                    <Link
                      href={`/certificate/${result.certificate_id}`}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[var(--snow)] text-[#06121e] font-semibold hover:bg-white"
                    >
                      <Award className="w-4 h-4" /> {t('certificate')}
                    </Link>
                  ) : (
                    <button onClick={retry} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-[var(--line)] hover:border-[var(--glacier)]/60">
                      {t('retry')}
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-4" lang={lesson.language}>
                <h3 className="text-lg font-semibold">{t('explanations')}</h3>
                <ol className="space-y-4">
                  {result.results.map((res, i) => (
                    <li key={i} className="rounded-xl border border-[var(--line)] p-4 space-y-2">
                      <p className="flex items-start gap-2 font-medium">
                        {res.correct ? (
                          <Check className="w-4 h-4 mt-1 shrink-0 text-emerald-400" aria-label={t('correct')} />
                        ) : (
                          <X className="w-4 h-4 mt-1 shrink-0 text-rose-400" aria-label={t('incorrect')} />
                        )}
                        <span>{quiz.questions[i]?.q}</span>
                      </p>
                      <p className="text-sm text-[var(--snow)] pl-6">→ {quiz.questions[i]?.options[res.answer_index]}</p>
                      <p className="text-sm text-[var(--mist)] pl-6 leading-relaxed">{res.explanation}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </motion.div>
          )}
        </section>
      )}
    </div>
  );
}
