import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Clapperboard, Play } from 'lucide-react';
import { getTranslations, getLocale } from 'next-intl/server';
import { fetchAssets } from '@/lib/db/supabase';
import { formatTimestamp } from '@/lib/utils';
import type { Asset } from '@/lib/types/database';
import { PageBand } from '@/components/public/PageBand';
import { Reveal, Stagger, StaggerItem } from '@/components/motion/Reveal';

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('videos');
  return { title: t('title'), description: t('subtitle') };
}

/** NCPOR's videos, embedded from YouTube. Films first; recordings of NCPOR events below. */
export default async function VideosPage() {
  const t = await getTranslations('videos');
  const tRegions = await getTranslations('regions');
  const hi = (await getLocale()) === 'hi';

  const [videos, events] = await Promise.all([fetchAssets({ type: 'video' }), fetchAssets({ type: 'event' })]);
  const recorded = new Set(events.flatMap((e) => e.ai_metadata?.event?.videos ?? []));
  const byNewest = (a: Asset, b: Asset) => (b.ai_metadata?.video?.published ?? '').localeCompare(a.ai_metadata?.video?.published ?? '');
  const films = videos.filter((v) => !recorded.has(v.ai_metadata?.video?.youtube_id ?? '')).sort(byNewest);
  const recordings = videos.filter((v) => recorded.has(v.ai_metadata?.video?.youtube_id ?? '')).sort(byNewest);

  const card = (v: Asset, large = false) => {
    const video = v.ai_metadata?.video;
    const title = hi && v.title_hi ? v.title_hi : v.title;
    const summary = hi && v.ai_summary_hi ? v.ai_summary_hi : v.ai_summary_simple;
    return (
      <Link href={`/asset/${v.id}`} className={`group grid gap-3 ${large ? 'md:grid-cols-[3fr_2fr] md:gap-8 md:items-center' : ''}`}>
        <div className="relative aspect-video overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--ink)]">
          {v.thumbnail && (
            <img src={v.thumbnail} alt="" loading={large ? 'eager' : 'lazy'} decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-[#06121e]/20 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden>
            <span className="rounded-full bg-[var(--glacier)] p-3 text-[#06121e]"><Play className="h-5 w-5 fill-current" /></span>
          </span>
        </div>
        <div className="space-y-2">
          <h3 className={`${large ? 'text-2xl sm:text-3xl' : 'text-lg'} font-semibold leading-snug group-hover:text-[var(--glacier)]`} lang={hi && v.title_hi ? 'hi' : undefined}>{title}</h3>
          <p className="text-sm text-[var(--mist)] tabular">
            {video ? formatTimestamp(video.duration_s) : ''}{video ? ', ' : ''}{tRegions(v.region)}, {v.year}
          </p>
          {summary && (
            <p className={`text-[var(--mist)] leading-relaxed ${large ? 'line-clamp-4' : 'line-clamp-2 text-sm'}`} lang={hi && v.ai_summary_hi ? 'hi' : undefined}>{summary}</p>
          )}
        </div>
      </Link>
    );
  };

  return (
    <>
    <PageBand band="videos" title={t('title')} subtitle={t('subtitle')} />
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-16">

      {videos.length === 0 ? (
        <div className="py-16 text-center space-y-3 border-y border-[var(--line)]">
          <Clapperboard className="w-8 h-8 text-[var(--mist)] mx-auto" aria-hidden />
          <h2 className="text-xl font-semibold">{t('emptyTitle')}</h2>
          <p className="text-[var(--mist)] max-w-sm mx-auto">{t('emptySubtitle')}</p>
        </div>
      ) : (
        <>
          {films.length > 0 && (
            <section className="space-y-8">
              <h2 className="text-2xl font-semibold">{t('films')}</h2>
              <Reveal>{card(films[0], true)}</Reveal>
              <Stagger as="ul" className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                {films.slice(1).map((v) => <StaggerItem as="li" key={v.id}>{card(v)}</StaggerItem>)}
              </Stagger>
            </section>
          )}
          {recordings.length > 0 && (
            <section className="space-y-8 border-t border-[var(--line)] pt-12">
              <h2 className="text-2xl font-semibold">{t('recordings')}</h2>
              <Stagger as="ul" className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                {recordings.map((v) => <StaggerItem as="li" key={v.id}>{card(v)}</StaggerItem>)}
              </Stagger>
            </section>
          )}
          <p className="text-sm text-[var(--mist)]">{t('source')}</p>
        </>
      )}
    </div>
    </>
  );
}
