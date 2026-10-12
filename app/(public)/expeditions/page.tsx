import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, Compass, Calendar, User } from 'lucide-react';
import { getTranslations, getLocale } from 'next-intl/server';
import { countAssetsByExpedition, fetchExpeditions } from '@/lib/db/supabase';
import { expeditionHref, expeditionWhen, isSourced, leaderOf } from '@/lib/expeditions';
import { resolveCovers } from '@/components/public/CoverFigure';
import { PageBand } from '@/components/public/PageBand';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('expeditions');
  return { title: t('title'), description: t('subtitle') };
}

export default async function ExpeditionsPage({
  searchParams,
}: {
  searchParams?: Promise<{ region?: string }>;
}) {
  const t = await getTranslations('expeditions');
  const tRegions = await getTranslations('regions');
  const locale = await getLocale();
  const resolvedParams = searchParams ? await searchParams : {};
  const currentRegion = resolvedParams.region || 'all';

  const [expeditions, counts] = await Promise.all([fetchExpeditions(), countAssetsByExpedition()]);
  const sorted = [...expeditions]
    .filter(e => isSourced(e) && (currentRegion === 'all' || e.region === currentRegion))
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  const covers = await resolveCovers(sorted, e => e.cover_image);

  const regionKeys = ['all', 'antarctic', 'arctic', 'southern_ocean', 'himalaya'] as const;

  return (
    <>
      <PageBand
        band="expeditions"
        eyebrow={<><Compass className="w-4 h-4" aria-hidden /> <span>{t('badge')}</span></>}
        title={t('title')}
        subtitle={t('subtitle')}
      >
        <nav aria-label={t('badge')} className="flex flex-wrap items-center gap-2">
          {regionKeys.map(r => (
            <Link
              key={r}
              href={r === 'all' ? '/expeditions' : `/expeditions?region=${r}`}
              aria-current={currentRegion === r ? 'page' : undefined}
              className="chip"
            >
              {r === 'all' ? t('all') : tRegions(r)}
            </Link>
          ))}
        </nav>
      </PageBand>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        {sorted.length === 0 ? (
          <p className="py-16 text-center text-[var(--mist)] border-y border-[var(--line)]">{t('empty')}</p>
        ) : (
          /* Mission log: the year leads, a hairline runs down the list, each row opens the expedition. */
          <ol className="border-t border-[var(--line)]">
            {sorted.map(exp => {
              const cover = covers.get(exp.id);
              const linked = counts.get(exp.id) ?? 0;
              const name = locale === 'hi' && exp.name_hi ? exp.name_hi : exp.name;
              const summary = locale === 'hi' && exp.summary_hi ? exp.summary_hi : exp.summary;
              const leader = leaderOf(exp);
              return (
                <li key={exp.id} className="reveal group relative border-b border-[var(--line)]">
                  <div className="grid gap-5 py-10 sm:grid-cols-[9rem_minmax(0,1fr)] lg:grid-cols-[11rem_minmax(0,1fr)_16rem] lg:gap-10">
                    <p aria-hidden data-text={exp.start_date.slice(0, 4)} className="ghost-text font-display font-bold tabular leading-none text-6xl sm:text-7xl text-[var(--snow)]/25 transition-colors duration-500 group-hover:text-[var(--glacier)]" />
                    <div className="space-y-3 min-w-0">
                      <p className="micro-cap flex flex-wrap items-center gap-x-3 gap-y-1 text-[var(--mist)]">
                        <span className="text-[var(--glacier)]">{exp.code}</span>
                        <span>{tRegions(exp.region)}</span>
                        <span className="inline-flex items-center gap-1.5 normal-case tracking-normal font-sans text-xs"><Calendar className="w-3.5 h-3.5" aria-hidden />{expeditionWhen(exp, locale === 'hi')}</span>
                      </p>
                      <h2 className="font-display text-2xl sm:text-3xl font-bold leading-tight text-[var(--snow)]" lang={locale === 'hi' && exp.name_hi ? 'hi' : undefined}>
                        <Link href={expeditionHref(exp)} className="after:absolute after:inset-0 focus-visible:outline-none group-hover:text-[var(--glacier)] transition-colors duration-500">
                          {name}
                        </Link>
                      </h2>
                      {leader && (
                        <p className="text-sm text-[var(--mist)] flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" aria-hidden />
                          <span>{t('leader')}</span>
                          <span className="text-[var(--snow)]">{leader}</span>
                        </p>
                      )}
                      <p className="text-[var(--snow)]/75 leading-relaxed max-w-[65ch]">{summary}</p>
                      <p className="micro-cap flex items-center justify-between gap-3 pt-1 text-[var(--mist)]">
                        <span>{linked > 0 ? t('exploreBtn', { count: linked }) : t('noLinked')}</span>
                        <span className="inline-flex items-center gap-2 text-[var(--snow)] lg:hidden">
                          {t('openDetails')} <ArrowRight className="w-4 h-4" aria-hidden />
                        </span>
                      </p>
                    </div>
                    <div className="hidden lg:flex flex-col justify-between gap-4">
                      {cover?.thumbnail ? (
                        <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-[var(--ink)]">
                          <img src={cover.thumbnail} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover opacity-80 transition-[transform,opacity] duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105 group-hover:opacity-100" />
                        </div>
                      ) : <span />}
                      <span className="micro-cap inline-flex items-center justify-end gap-2 text-[var(--snow)]">
                        {t('openDetails')}
                        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] transition-[transform,border-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1 group-hover:border-[var(--snow)]">
                          <ArrowRight className="w-4 h-4" aria-hidden />
                        </span>
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </>
  );
}
