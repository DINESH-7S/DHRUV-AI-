import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, Calendar, MapPin, PlayCircle } from 'lucide-react';
import { getTranslations, getLocale } from 'next-intl/server';
import { fetchAssets } from '@/lib/db/supabase';
import { formatDay } from '@/lib/utils';
import type { Asset } from '@/lib/types/database';
import { Stagger, StaggerItem } from '@/components/motion/Reveal';
import { PageBand } from '@/components/public/PageBand';

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('events');
  return { title: t('title'), description: t('subtitle') };
}

type Dated = { asset: Asset; starts: string; ends: string | null };

/** Institutional activities, newest first, each linked to its NCPOR or PIB source. */
export default async function EventsPage() {
  const t = await getTranslations('events');
  const locale = await getLocale();
  const hi = locale === 'hi';

  const events: Dated[] = (await fetchAssets({ type: 'event' }))
    .map((asset) => ({
      asset,
      starts: asset.ai_metadata?.event?.starts_at ?? `${asset.year}-01-01`,
      ends: asset.ai_metadata?.event?.ends_at ?? null,
    }))
    .sort((a, b) => b.starts.localeCompare(a.starts));

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter((e) => (e.ends ?? e.starts) >= today).reverse();
  const past = events.filter((e) => (e.ends ?? e.starts) < today);
  const years = [...new Set(past.map((e) => e.starts.slice(0, 4)))];

  const row = ({ asset, starts, ends }: Dated) => {
    const meta = asset.ai_metadata?.event;
    const title = hi && asset.title_hi ? asset.title_hi : asset.title;
    const summary = hi && asset.ai_summary_hi ? asset.ai_summary_hi : asset.ai_summary_simple || asset.description;
    return (
      <StaggerItem as="li" key={asset.id}>
        <Link href={`/asset/${asset.id}`} className="group grid grid-cols-[4.5rem_minmax(0,1fr)] sm:grid-cols-[6rem_minmax(0,1fr)] gap-4 sm:gap-8 py-8 px-3 -mx-3 rounded-md transition-colors duration-500 hover:bg-white/[0.03]">
          <div className="text-center tabular leading-tight pt-1">
            <p className="text-4xl sm:text-5xl font-bold font-display leading-none text-[var(--snow)]">{formatDay(starts, hi, { day: 'numeric' })}</p>
            <p className="micro-cap mt-1 text-[var(--glacier)]">{formatDay(starts, hi, { month: 'short' })}</p>
            {ends && ends !== starts && (
              <p className="mt-1 text-xs text-[var(--mist)]">{t('range', { from: formatDay(starts, hi, { day: 'numeric' }), to: formatDay(ends, hi, { day: 'numeric', month: 'short' }) })}</p>
            )}
          </div>
          <div className="space-y-2 min-w-0">
            <h3 className="font-display text-xl sm:text-2xl font-bold leading-snug transition-colors duration-500 group-hover:text-[var(--glacier)]" lang={hi && asset.title_hi ? 'hi' : undefined}>{title}</h3>
            <p className="flex items-center gap-1.5 text-sm text-[var(--mist)]">
              <MapPin className="w-4 h-4 shrink-0" aria-hidden /> <span className="truncate">{meta?.is_online ? t('online') : meta?.venue}</span>
            </p>
            <p className="text-[var(--mist)] leading-relaxed line-clamp-2" lang={hi && asset.ai_summary_hi ? 'hi' : undefined}>{summary}</p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
              {meta?.source_name && <span className="text-[var(--mist)]">{t('source')} <span className="text-[var(--snow)]">{meta.source_name}</span></span>}
              {!!meta?.videos?.length && (
                <span className="inline-flex items-center gap-1.5 text-[var(--glacier)]"><PlayCircle className="w-4 h-4" aria-hidden /> {t('recording')}</span>
              )}
              <span className="inline-flex items-center gap-1 font-medium text-[var(--glacier)]">
                {t('viewReport')} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" aria-hidden />
              </span>
            </div>
          </div>
        </Link>
      </StaggerItem>
    );
  };

  return (
    <>
    <PageBand band="events" eyebrow={t('badge')} title={t('title')} subtitle={t('subtitle')}>
      <a href="/events/calendar.ics" download className="btn-ghost">
        <Calendar className="w-4 h-4" aria-hidden /> {t('subscribe')}
      </a>
    </PageBand>
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-16">

      {events.length === 0 ? (
        <div className="py-16 text-center space-y-3 border-y border-[var(--line)]">
          <Calendar className="w-8 h-8 text-[var(--mist)] mx-auto" aria-hidden />
          <h2 className="text-xl font-semibold">{t('emptyTitle')}</h2>
          <p className="text-[var(--mist)] max-w-sm mx-auto">{t('emptySubtitle')}</p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section className="space-y-2">
              <h2 className="display text-3xl sm:text-4xl">{t('upcoming')}</h2>
              <Stagger as="ul" className="divide-y divide-[var(--line)]">{upcoming.map(row)}</Stagger>
            </section>
          )}
          <section className="space-y-8">
            <h2 className="sr-only">{t('past')}</h2>
            {years.map((year) => (
              <div key={year} className="space-y-1">
                <h3 className="font-display text-5xl sm:text-6xl font-bold tabular leading-none text-[var(--snow)]/55 border-b border-[var(--line)] pb-4">{year}</h3>
                <Stagger as="ul" className="divide-y divide-[var(--line)]">
                  {past.filter((e) => e.starts.startsWith(year)).map(row)}
                </Stagger>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
    </>
  );
}
