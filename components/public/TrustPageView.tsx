import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { TRUST, TRUST_UPDATED, type TrustSlug } from '@/lib/content/trust';
import { formatDay } from '@/lib/utils';
import { PageBand } from '@/components/public/PageBand';

export const TRUST_LINKS: TrustSlug[] = ['about', 'ai-policy', 'privacy', 'accessibility'];

export async function trustMetadata(slug: TrustSlug): Promise<Metadata> {
  const page = TRUST[slug][(await getLocale()) === 'hi' ? 'hi' : 'en'];
  return { title: page.title, description: page.intro.slice(0, 160) };
}

/** One of the four trust pages, in the visitor's language. */
export async function TrustPageView({ slug }: { slug: TrustSlug }) {
  const hi = (await getLocale()) === 'hi';
  const t = await getTranslations('trust');
  const page = TRUST[slug][hi ? 'hi' : 'en'];

  return (
    <div lang={hi ? 'hi' : undefined}>
    <PageBand eyebrow={t('eyebrow')} title={page.title} subtitle={page.intro} />
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-12">

      {page.sections.map((s) => (
        <section key={s.h} className="space-y-3 border-t border-[var(--line)] pt-6">
          <h2 className="font-display text-2xl font-bold">{s.h}</h2>
          {s.p?.map((para) => (
            <p key={para} className="leading-relaxed text-[var(--snow)]/90">{para}</p>
          ))}
          {s.list && (
            <ul className="list-disc pl-5 space-y-2 leading-relaxed text-[var(--snow)]/90 marker:text-[var(--glacier)]">
              {s.list.map((item) => <li key={item}>{item}</li>)}
            </ul>
          )}
        </section>
      ))}

      <footer className="border-t border-[var(--line)] pt-6 space-y-3 text-sm text-[var(--mist)]">
        <p>{t('updated', { date: formatDay(TRUST_UPDATED, hi) })}</p>
        <nav aria-label={t('eyebrow')} className="flex flex-wrap gap-x-5 gap-y-2">
          {TRUST_LINKS.filter((l) => l !== slug).map((l) => (
            <Link key={l} href={`/${l}`} className="text-[var(--glacier)] hover:underline">
              {TRUST[l][hi ? 'hi' : 'en'].title}
            </Link>
          ))}
        </nav>
      </footer>
    </div>
    </div>
  );
}
