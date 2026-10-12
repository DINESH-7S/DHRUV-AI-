import React from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, FileText, Database, BookOpen, Play } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { countPublishedLessons, fetchAssets, fetchExpeditions, fetchStations } from '@/lib/db/supabase';
import { dossierOf, expeditionHref, expeditionWhen, isSourced } from '@/lib/expeditions';
import { ExpeditionScroller, type ScrollerItem } from '@/components/public/home/ExpeditionScroller';
import { StationTicker } from '@/components/public/home/StationTicker';
import { GlobeViewer } from '@/components/public/GlobeViewer';
import { PolarNow } from '@/components/public/PolarNow';
import { fetchStationWeather } from '@/lib/live/polar';
import { HeroIntro } from '@/components/public/home/HeroIntro';
import { CountUp } from '@/components/motion/CountUp';
import { ParallaxImage } from '@/components/motion/ParallaxImage';
import { Reveal, Stagger, StaggerItem } from '@/components/motion/Reveal';
import type { Asset } from '@/lib/types/database';
import { formatDay } from '@/lib/utils';

// Re-fetch at most once a minute so newly published assets appear without a redeploy.
export const revalidate = 60;

/** The 45th Indian Scientific Expedition to Antarctica reached Maitri on 4 Nov 2025 (NCPOR news 929). */
const ANTARCTIC_EXPEDITIONS = 45;

/** India's first scientific expedition to the South Pole (2010), a short NCPOR film: the home page's featured video. */
const FEATURED_VIDEO = 'pE1K3YQ43j8';

/** Hero photograph: Thamban Meloth, first Indian scientific expedition to the South Pole (CC BY-SA 4.0, toned). */
const HERO_PHOTO = '/asset/1b92a94c-3cde-4375-a18c-7e1801952e06';

const STEPS = [
  { title: 'step1Title', body: 'step1Body' },
  { title: 'step2Title', body: 'step2Body' },
  { title: 'step3Title', body: 'step3Body' },
  { title: 'step4Title', body: 'step4Body' },
] as const;

export default async function HomePage() {
  const [assets, stations, expeditions, lessonCount, t, tTypes, tLive, locale] = await Promise.all([
    fetchAssets(),
    fetchStations(),
    fetchExpeditions(),
    countPublishedLessons(),
    getTranslations('home'),
    getTranslations('types'),
    getTranslations('live'),
    getLocale(),
  ]);
  const hi = locale === 'hi';
  const title = (a: Asset) => (hi && a.title_hi ? a.title_hi : a.title);
  const summary = (a: Asset) => (hi && a.ai_summary_hi ? a.ai_summary_hi : a.ai_summary || a.description);

  // Live temperatures for the globe markers (same cached Open-Meteo request as the live panel).
  const activeStations = stations.filter(s => s.status === 'active');
  const weather = await fetchStationWeather(activeStations.map(s => ({ lat: Number(s.lat), lng: Number(s.lng) }))).catch(() => []);
  const temps: Record<string, number> = {};
  activeStations.forEach((s, i) => {
    const w = weather[i];
    if (w) temps[s.id] = w.tempC;
  });

  // The globe shows station names/descriptions in the visitor's language.
  const localizedStations = stations.map(s => ({
    ...s,
    name: hi && s.name_hi ? s.name_hi : s.name,
    description: hi && s.description_hi ? s.description_hi : s.description,
  }));

  // Bento: one photo leads, then a report, a dataset and a publication (whatever exists).
  const photos = assets.filter(a => a.type === 'photo' && a.thumbnail);
  const photo = photos.find(a => /maitri|bharati|gangotri/i.test(a.title)) ?? photos[0];
  const report = assets.find(a => a.type === 'report');
  const dataset = assets.find(a => a.type === 'dataset');
  const publication = assets.find(a => a.type === 'publication');
  const textCards = [report, dataset, publication].filter((a): a is Asset => !!a);
  const typeIcon = { report: FileText, publication: BookOpen, dataset: Database } as Record<string, typeof FileText>;

  // Videos + institutional activities (two nouns of the problem statement), newest activities first.
  const videos = assets.filter(a => a.type === 'video');
  const featuredVideo = videos.find(v => v.ai_metadata?.video?.youtube_id === FEATURED_VIDEO) ?? videos[0];
  const activities = assets
    .filter(a => a.type === 'event' && a.ai_metadata?.event?.starts_at)
    .sort((a, b) => b.ai_metadata!.event!.starts_at.localeCompare(a.ai_metadata!.event!.starts_at))
    .slice(0, 4);

  // Expedition timeline for the pinned scroller: sourced expeditions, oldest first, first milestone as the hook.
  const tRegions = await getTranslations('regions');
  const timeline: ScrollerItem[] = expeditions
    .filter(isSourced)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .map(e => {
      const m = [...(dossierOf(e)?.milestones ?? [])].sort((a, b) => a.date.localeCompare(b.date)).at(-1) ?? null;
      return {
        code: e.code,
        href: expeditionHref(e),
        year: e.start_date.slice(0, 4),
        name: hi && e.name_hi ? e.name_hi : e.name,
        nameLang: hi && e.name_hi ? 'hi' : undefined,
        region: tRegions(e.region),
        when: expeditionWhen(e, hi),
        milestone: m ? (hi && m.text_hi) || m.text : null,
        milestoneLang: m && hi && m.text_hi ? 'hi' : undefined,
      };
    });

  const stats = [
    { value: ANTARCTIC_EXPEDITIONS, suffix: '', label: t('statExpeditions') },
    { value: stations.length, suffix: '', label: t('statStations') },
    { value: assets.length, suffix: '', label: t('statArchive') },
    { value: expeditions.filter(isSourced).length, suffix: '', label: t('statReviewed') },
  ];

  return (
    <div className="relative">
      {/* Hero (DESIGN.md): copy on the canvas, a real expedition photograph bleeding to the right edge. */}
      <section className="relative isolate overflow-hidden bg-[var(--ink)] -mt-16 border-b border-[var(--line)]">
        <figure className="relative lg:absolute lg:inset-y-0 lg:right-0 lg:w-[58%] m-0">
          <picture>
            <source media="(max-width: 900px)" srcSet="/hero/south-pole-2010-900.webp" />
            <img
              src="/hero/south-pole-2010.webp"
              alt={t('heroPhotoAlt')}
              width={1920}
              height={1285}
              fetchPriority="high"
              decoding="async"
              className="hero-drift block w-full aspect-[3/2] lg:aspect-auto lg:h-full object-cover object-[62%_center] [mask-image:linear-gradient(to_bottom,black_55%,transparent)] lg:[mask-image:linear-gradient(to_right,transparent,black_42%)]"
            />
          </picture>
          <figcaption className="absolute right-3 bottom-3 max-w-[80%] rounded-sm bg-[var(--ink)]/75 px-2 py-1 text-right text-[11px] leading-snug text-[var(--snow)]/90">
            <Link href={HERO_PHOTO} className="hover:text-[var(--snow)] underline-offset-2 hover:underline">{t('heroCredit')}</Link>
          </figcaption>
        </figure>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 lg:mt-0 pb-14 lg:pb-0 lg:min-h-[min(86dvh,780px)] flex items-center lg:pt-24">
          <HeroIntro
            eyebrow={t('heroEyebrow')}
            line1={t('headline1')}
            line2={t('headline2')}
            intro={t('intro')}
            askLabel={t('askBtn')}
            exploreLabel={t('exploreLink')}
          />
        </div>
      </section>

      {/* Stats band: plain figures, hairline rules, no boxes */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Stagger as="dl" className="grid grid-cols-2 lg:grid-cols-4 border-b border-[var(--line)]">
          {stats.map((s, i) => (
            <StaggerItem key={s.label} className={`py-8 px-2 sm:px-6 ${i > 0 ? 'lg:border-l' : ''} ${i % 2 === 1 ? 'border-l' : ''} ${i < 2 ? 'border-b lg:border-b-0' : ''} border-[var(--line)]`}>
              <dt className="micro-cap text-[var(--mist)]">{s.label}</dt>
              <dd className="mt-2 font-display text-5xl sm:text-6xl font-bold tabular leading-none text-[var(--snow)]">
                <CountUp value={s.value} suffix={s.suffix} />
              </dd>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* Mission ticker: every station with its true coordinates */}
      <StationTicker stations={stations} hi={hi} estLabel={year => t('est', { year })} />

      {/* India's stations: the globe, then live weather and sunlight at each active station */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 space-y-8" aria-labelledby="live-h">
        <Reveal className="space-y-3 max-w-3xl">
          <p className="eyebrow flex items-center gap-2">
            <span className="relative flex w-2 h-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--glacier)] opacity-60 motion-safe:animate-ping" />
              <span className="relative inline-flex rounded-full w-2 h-2 bg-[var(--glacier)]" />
            </span>
            {tLive('eyebrow')}
          </p>
          <h2 id="live-h" className="display text-4xl sm:text-5xl">{tLive('title')}</h2>
          <p className="text-[var(--mist)]">{tLive('subtitle')}</p>
        </Reveal>
        <Reveal y={40}>
          <GlobeViewer stations={localizedStations} temps={temps} className="h-[420px] sm:h-[520px] lg:h-[620px]" />
        </Reveal>
        <PolarNow stations={stations.filter(s => s.status === 'active')} hi={hi} />
      </section>

      {/* Forty-five years on the ice: pinned horizontal timeline */}
      {timeline.length > 0 && (
        <div className="pt-24">
          <ExpeditionScroller
            eyebrow={t('scrollerEyebrow')}
            title={t('scrollerTitle')}
            intro={t('scrollerIntro')}
            openLabel={t('scrollerOpen')}
            allLabel={t('scrollerAll')}
            items={timeline}
          />
        </div>
      )}

      {/* How it works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 grid lg:grid-cols-[0.8fr_1.2fr] gap-12">
        <Reveal className="lg:sticky lg:top-28 self-start space-y-3">
          <h2 className="display text-4xl sm:text-5xl">{t('howTitle')}</h2>
        </Reveal>
        <Stagger as="div" className="grid sm:grid-cols-2 gap-8 lg:gap-10">
          {STEPS.map((step, i) => (
            <StaggerItem key={step.title} className="group border-t border-[var(--line)] pt-6 space-y-2.5">
              <p aria-hidden data-text={`0${i + 1}`} className="ghost-text font-display text-6xl font-bold leading-none tabular text-[var(--snow)]/15 transition-colors duration-700 group-hover:text-[var(--glacier)]" />
              <h3 className="text-xl font-semibold font-display text-[var(--snow)]">{t(step.title)}</h3>
              <p className="text-[var(--mist)] leading-relaxed text-sm">{t(step.body)}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* Archive bento */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <Reveal className="flex items-end justify-between gap-4 mb-8">
          <div className="space-y-1">
            <h2 className="display text-4xl sm:text-5xl">{t('archiveTitle')}</h2>
          </div>
          <Link href="/explore" prefetch={true} className="hidden sm:inline-flex micro-cap items-center gap-1.5 text-[var(--glacier)] hover:gap-2.5 transition-all">
            {t('exploreAll')} <ArrowRight className="w-4 h-4" />
          </Link>
        </Reveal>

        <Stagger className="grid md:grid-cols-3 md:grid-rows-3 gap-4 md:h-[560px]">
          {photo && (
            <StaggerItem className="md:col-span-2 md:row-span-3 min-h-[320px]">
            <Link href={`/asset/${photo.id}`} prefetch={true} className="spotlight group relative block h-full min-h-[320px] rounded-3xl overflow-hidden bg-[var(--ink)]">
              <ParallaxImage
                src={photo.thumbnail!}
                alt={photo.alt_text || title(photo)}
                className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-95 transition-opacity duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#06121e] via-[#06121e]/30 to-transparent" />
              <div className="absolute bottom-0 p-6 sm:p-8 space-y-2 max-w-xl">
                <p className="eyebrow">{tTypes('photo')}, {photo.year}</p>
                <h3 className="text-2xl sm:text-3xl font-semibold leading-snug" lang={hi && photo.title_hi ? 'hi' : undefined}>{title(photo)}</h3>
                <p className="text-sm text-[var(--snow)]/80 line-clamp-2">{hi && photo.ai_summary_hi ? photo.ai_summary_hi : photo.ai_caption}</p>
              </div>
            </Link>
            </StaggerItem>
          )}
          {textCards.map(a => {
            const Icon = typeIcon[a.type] ?? FileText;
            return (
              <StaggerItem key={a.id}>
              <Link href={`/asset/${a.id}`} prefetch={true} className="spotlight group glass-card rounded-2xl p-5 h-full flex flex-col justify-between gap-3 min-h-[160px]">
                <div className="flex items-center justify-between text-xs text-[var(--mist)]">
                  <span className="inline-flex items-center gap-1.5">
                    <Icon className="w-4 h-4 text-[var(--glacier)]" /> {tTypes(a.type)}
                  </span>
                  <span className="font-mono tabular">{a.year}</span>
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-semibold leading-snug line-clamp-2 group-hover:text-[var(--glacier)]" lang={hi && a.title_hi ? 'hi' : undefined}>{title(a)}</h3>
                  <p className="text-xs text-[var(--mist)] line-clamp-2">{summary(a)}</p>
                </div>
              </Link>
              </StaggerItem>
            );
          })}
        </Stagger>
      </section>

      {/* Videos + latest activities */}
      {(featuredVideo || activities.length > 0) && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 grid grid-cols-1 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] gap-10 lg:gap-14 [&>*]:min-w-0">
          {featuredVideo && (
            <Reveal className="space-y-5">
              <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
                <h2 className="display text-4xl sm:text-5xl">{t('videosTitle')}</h2>
                <Link href="/videos" prefetch={true} className="inline-flex micro-cap items-center gap-1.5 text-[var(--glacier)] hover:gap-2.5 transition-all">
                  {t('videosLink', { count: videos.length })} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <Link href={`/asset/${featuredVideo.id}`} prefetch={true} className="group block space-y-3">
                <div className="relative aspect-video overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--ink)]">
                  {featuredVideo.thumbnail && (
                    <img src={featuredVideo.thumbnail} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover opacity-85 transition-transform duration-700 group-hover:scale-[1.03]" />
                  )}
                  <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
                    <span className="rounded-full bg-[var(--glacier)] p-4 text-[#06121e] shadow-lg transition-transform group-hover:scale-105"><Play className="h-6 w-6 fill-current" /></span>
                  </span>
                </div>
                <h3 className="text-xl font-semibold leading-snug group-hover:text-[var(--glacier)]" lang={hi && featuredVideo.title_hi ? 'hi' : undefined}>{title(featuredVideo)}</h3>
                <p className="text-sm text-[var(--mist)] line-clamp-2" lang={hi && featuredVideo.ai_summary_hi ? 'hi' : undefined}>
                  {hi && featuredVideo.ai_summary_hi ? featuredVideo.ai_summary_hi : featuredVideo.ai_summary_simple}
                </p>
              </Link>
            </Reveal>
          )}
          {activities.length > 0 && (
            <Reveal className="space-y-5">
              <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
                <h2 className="display text-4xl sm:text-5xl">{t('activitiesTitle')}</h2>
                <Link href="/events" prefetch={true} className="inline-flex micro-cap items-center gap-1.5 text-[var(--glacier)] hover:gap-2.5 transition-all">
                  {t('activitiesLink')} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
                {activities.map(a => (
                  <li key={a.id}>
                    <Link href={`/asset/${a.id}`} prefetch={true} className="group grid grid-cols-[4.5rem_minmax(0,1fr)] gap-4 py-4">
                      <span className="tabular text-sm text-[var(--glacier)] pt-0.5">{formatDay(a.ai_metadata!.event!.starts_at, hi, { day: 'numeric', month: 'short' })}</span>
                      <span className="space-y-1">
                        <span className="block font-semibold leading-snug group-hover:text-[var(--glacier)]" lang={hi && a.title_hi ? 'hi' : undefined}>{title(a)}</span>
                        <span className="block text-sm text-[var(--mist)] truncate">{a.ai_metadata!.event!.venue}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Reveal>
          )}
        </section>
      )}

      {/* Learn + Ask */}
      <Stagger className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-28 grid lg:grid-cols-2 gap-6">
        <StaggerItem className="spotlight rounded-3xl p-8 sm:p-10 bg-[var(--navy-raised)] border border-[var(--line)] flex flex-col justify-between gap-8">
          <div className="space-y-3">
            <h2 className="display text-4xl">{t('learnTitle')}</h2>
            <p className="text-[var(--mist)] leading-relaxed max-w-[52ch] text-sm sm:text-base">{t('learnBody')}</p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="font-mono text-xs text-[var(--mist)] tabular">{t('learnCount', { count: lessonCount })}</span>
            <Link href="/learn" prefetch={true} className="btn-ghost">
              {t('learnCta')} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </StaggerItem>

        <StaggerItem className="spotlight rounded-3xl p-8 sm:p-10 bg-[var(--navy-raised)] border border-[var(--line)] flex flex-col justify-between gap-8">
          <div className="space-y-3">
            <h2 className="display text-4xl">{t('askTitle')}</h2>
            <p className="text-[var(--mist)] leading-relaxed max-w-[52ch] text-sm sm:text-base">{t('askBody')}</p>
          </div>
          <Link
            href={`/ask?q=${encodeURIComponent(t('askSample'))}`}
            prefetch={true}
            className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-4 rounded-xl bg-[var(--ink)] border border-[var(--line)] hover:border-[var(--glacier)]/50 transition-colors"
          >
            <span className="text-sm text-[var(--snow)]">“{t('askSample')}”</span>
            <span className="shrink-0 inline-flex items-center gap-1 text-sm font-medium text-[var(--glacier)]">
              {t('askCta')} <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </span>
          </Link>
        </StaggerItem>
      </Stagger>
    </div>
  );
}
