import React from 'react';
import Link from 'next/link';
import { TRUST } from '@/lib/content/trust';
import { PolarGraticule } from '@/components/graphics/PolarGraticule';
import { getLocale, getTranslations } from 'next-intl/server';
import { fetchStations } from '@/lib/db/supabase';

const FOOTER_STATIONS = ['Maitri', 'Bharati', 'Himadri'];

export async function Footer() {
  const [t, stations, locale] = await Promise.all([getTranslations('footer'), fetchStations().catch(() => []), getLocale()]);
  const tAcc = await getTranslations('accuracy');
  // Link to real station ids from the database (names match the seed data).
  const stationLinks = FOOTER_STATIONS.map(name => stations.find(s => s.name.startsWith(name))).filter(
    (s): s is NonNullable<typeof s> => !!s,
  );

  return (
    <footer className="relative isolate w-full overflow-hidden border-t border-[var(--line)] bg-[var(--ink)] mt-24">
      {/* Signature graphic: India's Antarctic stations on a polar grid, turning slowly. */}
      <div aria-hidden className="absolute -z-10 -right-40 -bottom-72 w-[56rem] opacity-40">
        <PolarGraticule className="w-full h-auto" />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand Info */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <span className="font-display text-2xl font-bold tracking-[0.18em] text-[var(--snow)]">DHRUV</span>
              <span className="font-mono text-[11px] font-semibold text-[var(--glacier)] border border-[var(--glacier)]/30 px-2 py-0.5 rounded-md bg-[var(--glacier)]/10">SIH26063</span>
            </div>
            <p className="text-xs text-[var(--mist)] leading-relaxed">{t('about')}</p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="micro-cap text-[var(--snow)] mb-4">{t('explore')}</h4>
            <ul className="space-y-2 text-xs text-[var(--mist)]">
              <li><Link href="/explore" prefetch={true} className="hover:text-[var(--snow)] transition-colors">{t('archive')}</Link></li>
              <li><Link href="/expeditions" prefetch={true} className="hover:text-[var(--snow)] transition-colors">{t('expeditions')}</Link></li>
              {stationLinks.map(s => (
                <li key={s.id}>
                  <Link href={`/stations/${s.id}`} prefetch={true} className="hover:text-[var(--snow)] transition-colors">{t('station', { name: locale === 'hi' && s.name_hi ? s.name_hi : s.name })}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Educational Resources */}
          <div>
            <h4 className="micro-cap text-[var(--snow)] mb-4">{t('education')}</h4>
            <ul className="space-y-2 text-xs text-[var(--mist)]">
              <li><Link href="/learn" prefetch={true} className="hover:text-[var(--snow)] transition-colors">{t('lessons')}</Link></li>
              <li><Link href="/ask" prefetch={true} className="hover:text-[var(--snow)] transition-colors">{t('ask')}</Link></li>
              <li><Link href="/gallery" prefetch={true} className="hover:text-[var(--snow)] transition-colors">{t('gallery')}</Link></li>
              <li><Link href="/news" prefetch={true} className="hover:text-[var(--snow)] transition-colors">{t('news')}</Link></li>
            </ul>
          </div>

          {/* Prototype disclaimer */}
          <div>
            <h4 className="micro-cap text-[var(--snow)] mb-4">{t('about_title')}</h4>
            <div className="p-3.5 rounded-xl bg-[var(--ink)] border border-[var(--line)] text-xs text-[var(--mist)] space-y-2">
              <p>{t('prototype')}</p>
              <p className="text-[11px] text-[var(--glacier)]">{t('credits')}</p>
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
              {(['about', 'ai-policy', 'privacy', 'accessibility'] as const).map(slug => (
                <li key={slug}>
                  <Link href={`/${slug}`} prefetch={true} className="text-[var(--mist)] hover:text-[var(--snow)] transition-colors">
                    {TRUST[slug][locale === 'hi' ? 'hi' : 'en'].title}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/accuracy" prefetch={true} className="text-[var(--mist)] hover:text-[var(--snow)] transition-colors">{tAcc('title')}</Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Oversized wordmark (decorative; the name is announced above). */}
        <p aria-hidden data-text="DHRUV" className="ghost-text reveal mt-20 select-none font-display font-bold leading-[0.8] tracking-[0.04em] text-[var(--snow)]/[0.06] text-[26vw] lg:text-[17rem] -mb-4" />

        <div className="pt-6 border-t border-[var(--line)] flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[var(--mist)]">
          <p>{t('copyright')}</p>
          <div className="flex space-x-4">
            <Link href="/admin" prefetch={true} className="hover:text-[var(--snow)] transition-colors">{t('staff')}</Link>
            <Link href="/verify" prefetch={true} className="hover:text-[var(--snow)] transition-colors">{t('verify')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
