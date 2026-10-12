import React from 'react';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import bands from '@/lib/content/bands.json';
import { PolarGraticule, type GraticuleStation } from '@/components/graphics/PolarGraticule';
import { SplitWords } from '@/components/motion/SplitWords';

export type BandKey = keyof typeof bands;

interface Band {
  id: string;
  src: string;
  srcSmall: string;
  focus: string;
  title: string;
  title_hi: string | null;
  author: string;
  license: string;
  alt: string;
}

interface PageBandProps {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** A credited archive photograph (lib/content/bands.json); without one the polar graticule is drawn. */
  band?: BandKey;
  /** Graticule options when there is no photograph. */
  pole?: 'south' | 'north';
  stations?: GraticuleStation[];
  /** Keep the title's own case (names, asset titles) instead of display capitals. */
  plainTitle?: boolean;
  titleLang?: string;
  /** Filters, stats or actions under the subtitle. */
  children?: React.ReactNode;
}

/**
 * Page opener (DESIGN.md): a full-bleed, toned archive photograph (or the polar graticule), with
 * the page title in display capitals rising in over it. Sits under the transparent navbar.
 */
export async function PageBand({ eyebrow, title, subtitle, band, pole = 'south', stations, plainTitle, titleLang, children }: PageBandProps) {
  const hi = (await getLocale()) === 'hi';
  const t = await getTranslations('band');
  const photo = band ? (bands[band] as Band) : null;

  return (
    <header className="relative isolate overflow-hidden -mt-16 border-b border-[var(--line)] bg-[var(--ink)]">
      {photo ? (
        <>
          <picture>
            <source media="(max-width: 900px)" srcSet={photo.srcSmall} />
            <img
              src={photo.src}
              alt=""
              fetchPriority="high"
              decoding="async"
              className="band-img absolute inset-0 -z-20 h-full w-full object-cover"
              style={{ objectPosition: photo.focus }}
            />
          </picture>
          {/* Grade for legibility (WCAG AA): darker at the bottom where the title sits. */}
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-[var(--navy)] via-[var(--navy)]/75 to-[var(--ink)]/35" />
          <p className="absolute right-3 bottom-3 z-10 max-w-[min(70%,34rem)] line-clamp-2 text-right text-[11px] leading-snug text-[var(--snow)]/70">
            <Link href={`/asset/${photo.id}`} className="hover:text-[var(--snow)] hover:underline underline-offset-2">
              {t('credit', { title: hi && photo.title_hi ? photo.title_hi : photo.title, author: photo.author, license: photo.license })}
            </Link>
          </p>
        </>
      ) : (
        <div aria-hidden className="absolute -z-10 right-[-18rem] sm:right-[-10rem] lg:right-[-4rem] top-1/2 -translate-y-1/2 w-[46rem] max-w-none opacity-80">
          <PolarGraticule pole={pole} stations={stations} className="w-full h-auto" />
        </div>
      )}

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 sm:pt-40 pb-12 sm:pb-16 min-h-[22rem] sm:min-h-[30rem] flex flex-col justify-end">
        <div className="max-w-3xl space-y-5">
          {eyebrow && (
            <div style={{ '--i': 0 } as React.CSSProperties} className="rise eyebrow flex items-center gap-2">
              {eyebrow}
            </div>
          )}
          <h1
            lang={titleLang}
            className={`text-[var(--snow)] ${plainTitle ? 'normal-case tracking-normal text-4xl sm:text-6xl leading-[1.05]' : 'text-5xl sm:text-7xl leading-[0.95]'}`}
          >
            {typeof title === 'string' ? <SplitWords text={title} /> : title}
          </h1>
          {subtitle && (
            <div style={{ '--i': 2 } as React.CSSProperties} className="rise text-lg text-[var(--snow)]/80 leading-relaxed max-w-[62ch]">
              {subtitle}
            </div>
          )}
          {children && (
            <div style={{ '--i': 3 } as React.CSSProperties} className="rise pt-2">
              {children}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
