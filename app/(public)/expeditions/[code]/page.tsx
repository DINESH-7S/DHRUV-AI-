import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Calendar, ExternalLink, MapPin, User } from 'lucide-react';
import { getTranslations, getLocale } from 'next-intl/server';
import { fetchAssets, fetchExpeditions, fetchStations } from '@/lib/db/supabase';
import { dossierOf, expeditionWhen, isSourced, leaderOf } from '@/lib/expeditions';
import { formatDay, smallThumbnail } from '@/lib/utils';
import { PageBand } from '@/components/public/PageBand';
import { Reveal } from '@/components/motion/Reveal';
import { RouteMap } from '@/components/public/RouteMap';
import type { Asset } from '@/lib/types/database';

export const revalidate = 60;

async function findExpedition(code: string) {
  const wanted = decodeURIComponent(code).toUpperCase();
  const all = await fetchExpeditions();
  return all.find(e => e.code.toUpperCase() === wanted && isSourced(e)) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const exp = await findExpedition((await params).code);
  if (!exp) return {};
  const hi = (await getLocale()) === 'hi';
  return {
    title: hi && exp.name_hi ? exp.name_hi : exp.name,
    description: (hi && exp.summary_hi) || exp.summary,
  };
}

/** Date an archive item belongs to: the event day, the video's publish date, else its year. */
function assetDate(a: Asset): string {
  return a.ai_metadata?.event?.starts_at ?? a.ai_metadata?.video?.published ?? `${a.year}-01-01`;
}

export default async function ExpeditionPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const t = await getTranslations('expeditions');
  const tRegions = await getTranslations('regions');
  const tTypes = await getTranslations('types');
  const hi = (await getLocale()) === 'hi';

  const exp = await findExpedition(code);
  if (!exp) notFound();
  const dossier = dossierOf(exp)!;

  const [linked, stations] = await Promise.all([fetchAssets({ expedition_id: exp.id }), fetchStations()]);
  const items = [...linked].sort((a, b) => assetDate(a).localeCompare(assetDate(b)));
  const station = dossier.station ? stations.find(s => s.name === dossier.station) : null;
  const name = hi && exp.name_hi ? exp.name_hi : exp.name;
  const summary = hi && exp.summary_hi ? exp.summary_hi : exp.summary;
  const leader = leaderOf(exp);
  const stopNames = dossier.stops.map(s => (hi && s.label_hi) || s.label).join(' → ');
  const milestones = [...dossier.milestones].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <>
    <PageBand
      pole={exp.region === 'arctic' ? 'north' : 'south'}
      eyebrow={<>{exp.code} · {tRegions(exp.region)}</>}
      title={name}
      titleLang={hi && exp.name_hi ? 'hi' : undefined}
      subtitle={<span lang={hi && exp.summary_hi ? 'hi' : undefined}>{summary}</span>}
    >
          <dl className="grid gap-2 text-sm sm:grid-cols-3 sm:gap-6 border-t border-[var(--line)] pt-5">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[var(--glacier)] shrink-0" aria-hidden />
              <dt className="sr-only">{t('when')}</dt>
              <dd className="tabular">{expeditionWhen(exp, hi)}</dd>
            </div>
            {leader && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[var(--glacier)] shrink-0" aria-hidden />
                <dt className="text-[var(--mist)]">{t('leader')}</dt>
                <dd className="font-medium">{leader}</dd>
              </div>
            )}
            {station && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[var(--glacier)] shrink-0" aria-hidden />
                <dt className="text-[var(--mist)]">{t('station')}</dt>
                <dd>
                  <Link href={`/stations/${station.id}`} className="font-medium text-[var(--glacier)] hover:underline">
                    {(hi && station.name_hi) || station.name}
                  </Link>
                </dd>
              </div>
            )}
          </dl>
    </PageBand>

    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-20">
      <Link href="/expeditions" className="micro-cap inline-flex items-center gap-2 text-[var(--mist)] hover:text-[var(--snow)]">
        <ArrowLeft className="w-4 h-4" aria-hidden /> {t('back')}
      </Link>

        <figure className="reveal-wipe space-y-3">
          <RouteMap stops={dossier.stops} hi={hi} label={t('routeLabel', { stops: stopNames })} />
          <figcaption className="text-xs text-[var(--mist)] leading-relaxed">
            <span className="font-medium text-[var(--snow)]">{t('route')}:</span> {stopNames}. {t('routeNote')} {t('mapCredit')}
          </figcaption>
        </figure>

      <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
        <section className="space-y-5" aria-labelledby="timeline-h">
          <h2 id="timeline-h" className="display text-3xl sm:text-4xl">{t('timeline')}</h2>
          <ol className="relative border-l-2 border-[var(--glacier)]/30 ml-2 space-y-6 pl-6">
            {milestones.map((m, i) => {
              const src = m.source !== undefined ? dossier.sources[m.source] : undefined;
              return (
                <li key={i} className="relative">
                  <span aria-hidden className="absolute -left-[33px] top-1.5 w-3 h-3 rounded-full bg-[var(--navy)] border-2 border-[var(--glacier)]" />
                  <p className="text-xs font-mono tabular text-[var(--glacier)]">{formatDay(m.date, hi)}</p>
                  <p className="mt-1 leading-relaxed" lang={hi && m.text_hi ? 'hi' : undefined}>
                    {(hi && m.text_hi) || m.text}
                    {src && (
                      <>
                        {' '}
                        <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--mist)] underline underline-offset-2 hover:text-[var(--glacier)]">
                          ({t('sourceLink')})
                        </a>
                      </>
                    )}
                  </p>
                </li>
              );
            })}
          </ol>

          <div className="space-y-2 pt-4 border-t border-[var(--line)]">
            <h3 className="text-sm font-semibold">{t('sources')}</h3>
            <p className="text-xs text-[var(--mist)]">{t('sourcesNote')}</p>
            <ul className="space-y-1.5">
              {dossier.sources.map(s => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1.5 text-sm text-[var(--glacier)] hover:underline">
                    <ExternalLink className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden />
                    <span>{s.name}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="space-y-5" aria-labelledby="archive-h">
          <h2 id="archive-h" className="text-2xl font-semibold">
            {t('archiveTitle')} <span className="text-[var(--mist)] tabular">({items.length})</span>
          </h2>
          {items.length === 0 ? (
            <p className="py-10 text-center text-[var(--mist)] border-y border-[var(--line)]">{t('noArchive')}</p>
          ) : (
            <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
              {items.map(a => {
                const title = hi && a.title_hi ? a.title_hi : a.title;
                return (
                  <li key={a.id}>
                    <Link href={`/asset/${a.id}`} className="group flex items-center gap-4 py-3">
                      {a.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={smallThumbnail(a.thumbnail)} alt="" loading="lazy" decoding="async" className="w-20 h-14 rounded-lg object-cover bg-[var(--ink)] shrink-0" />
                      ) : (
                        <span className="w-20 h-14 rounded-lg bg-[var(--navy-raised)] border border-[var(--line)] shrink-0" aria-hidden />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs text-[var(--glacier)]">
                          {tTypes(a.type)} · <span className="tabular">{a.type === 'event' || a.type === 'video' ? formatDay(assetDate(a), hi) : a.year}</span>
                        </span>
                        <span className="block font-medium leading-snug line-clamp-2 group-hover:text-[var(--glacier)]" lang={hi && a.title_hi ? 'hi' : undefined}>{title}</span>
                      </span>
                      <ArrowRight className="w-4 h-4 text-[var(--mist)] group-hover:translate-x-1 transition-transform shrink-0" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
    </>
  );
}
