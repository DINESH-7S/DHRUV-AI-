"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, BookOpen } from 'lucide-react';
import { Reveal, Stagger, StaggerItem } from '@/components/motion/Reveal';

interface LessonItem {
  id: string;
  asset_id: string;
  title: string;
  grade_band: '6-8' | '9-10' | '11-12';
  language: string;
  learning_objectives: string[];
  quiz_id?: string;
  created_at: string;
}

let cachedLessons: LessonItem[] | null = null;

export default function LearnPage() {
  const t = useTranslations('learn');
  const [lessons, setLessons] = useState<LessonItem[]>(() => cachedLessons ?? []);
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [loading, setLoading] = useState(() => !cachedLessons);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function loadLessons() {
      if (!cachedLessons) setLoading(true);
      setError(false);
      try {
        const res = await fetch('/api/education/lessons');
        if (!res.ok) throw new Error();
        const data = await res.json();
        const items = Array.isArray(data) ? data : [];
        cachedLessons = items;
        setLessons(items);
      } catch {
        if (!cachedLessons) setError(true);
      } finally {
        setLoading(false);
      }
    }
    loadLessons();
  }, []);

  const filtered = selectedGrade === 'all' ? lessons : lessons.filter(l => l.grade_band === selectedGrade);

  const grades = [
    { id: 'all', label: t('all') },
    { id: '6-8', label: t('g68') },
    { id: '9-10', label: t('g910') },
    { id: '11-12', label: t('g1112') },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 space-y-12 min-h-[100dvh]">
      {/* Class filter */}
      <div role="group" aria-label={t('filterLabel')} className="flex flex-wrap gap-2">
        {grades.map(gb => (
          <button
            key={gb.id}
            onClick={() => setSelectedGrade(gb.id)}
            aria-pressed={selectedGrade === gb.id}
            className="chip"
          >
            {gb.label}
          </button>
        ))}
      </div>

      {/* Lessons */}
      {loading ? (
        <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)]" aria-busy="true">
          {[1, 2, 3].map(i => (
            <li key={i} className="py-7 grid sm:grid-cols-[8rem_1fr] gap-4 animate-pulse">
              <div className="h-5 w-20 rounded bg-white/5" />
              <div className="space-y-3">
                <div className="h-6 w-3/4 rounded bg-white/5" />
                <div className="h-4 w-1/2 rounded bg-white/5" />
              </div>
            </li>
          ))}
        </ul>
      ) : error ? (
        <p role="alert" className="p-6 rounded-2xl border border-rose-400/30 bg-rose-500/5 text-rose-200">{t('loadError')}</p>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center space-y-3 border-y border-[var(--line)]">
          <BookOpen className="w-8 h-8 text-[var(--mist)] mx-auto" />
          <h2 className="text-xl font-semibold">{t('emptyTitle')}</h2>
          <p className="text-[var(--mist)] max-w-sm mx-auto">{t('emptyText')}</p>
        </div>
      ) : (
        <Stagger as="ul" immediate key={selectedGrade} className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {filtered.map(lesson => (
            <StaggerItem as="li" key={lesson.id}>
              <Link
                href={`/learn/${lesson.id}`}
                prefetch={true}
                className="spotlight group grid sm:grid-cols-[8rem_minmax(0,1fr)_auto] gap-x-6 gap-y-3 py-7 px-3 -mx-3 rounded-xl hover:bg-white/[0.03]"
              >
                <div className="flex sm:flex-col gap-2 sm:gap-1.5 text-sm">
                  <span className="font-semibold text-[var(--glacier)]">{t('grade', { grade: lesson.grade_band })}</span>
                  <span className="text-[var(--mist)]">{lesson.language === 'hi' ? 'हिन्दी' : 'English'}</span>
                </div>

                <div className="space-y-2 min-w-0" lang={lesson.language}>
                  <h2 className="text-xl sm:text-2xl font-semibold leading-snug group-hover:text-[var(--glacier)]">{lesson.title}</h2>
                  {lesson.learning_objectives?.[0] && (
                    <p className="text-[var(--mist)] leading-relaxed line-clamp-2">{lesson.learning_objectives[0]}</p>
                  )}
                </div>

                <span className="hidden sm:flex items-center gap-1.5 self-center text-sm font-medium text-[var(--mist)] group-hover:text-[var(--glacier)] whitespace-nowrap">
                  {t('start')}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}
