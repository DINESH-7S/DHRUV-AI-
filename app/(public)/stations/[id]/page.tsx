import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { getTranslations, getLocale } from 'next-intl/server';
import { fetchStations, fetchAssets } from '@/lib/db/supabase';
import bands from '@/lib/content/bands.json';
import { PageBand, type BandKey } from '@/components/public/PageBand';
import { Reveal, Stagger, StaggerItem } from '@/components/motion/Reveal';
import { CoverFigure, resolveCovers } from '@/components/public/CoverFigure';
import { PolarNow } from '@/components/public/PolarNow';

export const revalidate = 60;

async function findStation(id: string) {
  const stations = await fetchStations();
  return stations.find(s => s.id === id) ?? stations.find(s => s.name.toLowerCase() === id.toLowerCase()) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const station = await findStation((await params).id);
  if (!station) return {};
  const locale = await getLocale();
  return {
    title: locale === 'hi' && station.name_hi ? station.name_hi : station.name,
    description: (locale === 'hi' && station.description_hi) || station.description,
  };
}

export default async function StationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations('station');
  const tRegions = await getTranslations('regions');
  const tTypes = await getTranslations('types');
  const tCommon = await getTranslations('common');
  const tLive = await getTranslations('live');
  const locale = await getLocale();

  const station = await findStation(id);
  if (!station) notFound();

  const [stationAssets, covers] = await Promise.all([
    fetchAssets({ station_id: station.id }),
    resolveCovers([station], s => s.image),
  ]);
  // Station photo band: lib/content/bands.json keys are "station-<name>".
  const bandKey = `station-${station.name.toLowerCase().replace(/\s+/g, '-')}`;
  const name = locale === 'hi' && station.name_hi ? station.name_hi : station.name;
  const hiName = locale === 'hi' && station.name_hi ? 'hi' : undefined;

  return (
    <>
    <PageBand
      band={bandKey in bands ? (bandKey as BandKey) : undefined}
      pole={station.region === 'arctic' ? 'north' : 'south'}
      eyebrow={<>{tRegions(station.region)} · {t('established', { year: station.established_year })} · {t(`status.${station.status}`)}</>}
      title={name}
      titleLang={hiName}
      subtitle={locale === 'hi' && station.description_hi ? station.description_hi : station.description}
    >
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
        <Link href={`/explore?station_id=${station.id}`} className="btn-ghost group">
          {t('searchBtn')} <ArrowRight className="w-4 h-4 transition-transform duration-500 group-hover:translate-x-1" aria-hidden />
        </Link>
        <p className="font-mono text-sm text-[var(--snow)]/70 tabular">{t('coordinates', { lat: station.lat, lng: station.lng })}</p>
      </div>
    </PageBand>
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-20">
      <Link href="/" className="micro-cap inline-flex items-center gap-2 text-[var(--mist)] hover:text-[var(--snow)]">
        <ArrowLeft className="w-4 h-4" aria-hidden /> {t('back')}
      </Link>

      {station.status !== 'decommissioned' && (
        <section className="space-y-4 max-w-md" aria-labelledby="live-h">
          <h2 id="live-h" className="display text-3xl" lang={hiName}>{tLive('titleAt', { name })}</h2>
          <PolarNow stations={[station]} hi={locale === 'hi'} variant="single" />
        </section>
      )}

      <section className="space-y-6">
        <h2 className="display text-3xl sm:text-4xl">
          {t('researchTitle', { name })} <span className="text-[var(--mist)] tabular">({stationAssets.length})</span>
        </h2>

        {stationAssets.length === 0 ? (
          <p className="py-12 text-center text-[var(--mist)] border-y border-[var(--line)]">{t('noAssets')}</p>
        ) : (
          <Stagger as="ul" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stationAssets.map(asset => {
              const title = locale === 'hi' && asset.title_hi ? asset.title_hi : asset.title;
              const summary = locale === 'hi' && asset.ai_summary_hi ? asset.ai_summary_hi : asset.ai_summary || asset.description;
              return (
                <StaggerItem as="li" key={asset.id}>
                  <Link
                    href={`/asset/${asset.id}`}
                    className="glass-card group flex h-full flex-col justify-between gap-4 rounded-md p-6"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-[var(--glacier)]">{tTypes(asset.type)}</span>
                        <span className="text-[var(--mist)] tabular">{asset.year}</span>
                      </div>
                      <h3 className="font-display text-xl font-bold leading-snug line-clamp-2 transition-colors duration-500 group-hover:text-[var(--glacier)]" lang={locale === 'hi' && asset.title_hi ? 'hi' : undefined}>{title}</h3>
                      <p className="text-sm text-[var(--mist)] leading-relaxed line-clamp-3" lang={locale === 'hi' && asset.ai_summary_hi ? 'hi' : undefined}>{summary}</p>
                    </div>
                    <div className="flex items-center justify-between border-t border-[var(--line)] pt-3 text-sm text-[var(--mist)]">
                      <span className="truncate">{asset.authors?.filter(Boolean)[0] ?? ''}</span>
                      <span className="inline-flex items-center gap-1 text-[var(--glacier)] whitespace-nowrap">
                        {tCommon('viewDetails')} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </Link>
                </StaggerItem>
              );
            })}
          </Stagger>
        )}
      </section>
    </div>
    </>
  );
}
