import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { ArrowLeft, ArrowUpRight, ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';
import { PolarGraticule } from '@/components/graphics/PolarGraticule';
import Markdown from '@/components/shared/Markdown';
import { checkPost } from '@/lib/posts/verify';
import { resolveSiteLinks } from '@/lib/site';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('verifyPost');
  // A check page is for the person holding the code, not for search engines.
  return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

const ROLE_KEY: Record<string, string> = { reviewer: 'roleReviewer', super_admin: 'roleAdmin' };
const LONG_FORM = new Set(['blog', 'press_release', 'newsletter']);

export default async function VerifyPostPage({ params }: { params: Promise<{ code: string }> }) {
  const { code: input } = await params;
  const [check, t, locale] = await Promise.all([checkPost(decodeURIComponent(input)), getTranslations('verifyPost'), getLocale()]);
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });

  const view = {
    genuine: { Icon: ShieldCheck, title: t('genuineTitle'), lead: t('genuineLead'), tone: 'text-emerald-300', ring: 'border-emerald-400/40 bg-emerald-400/10' },
    not_approved: { Icon: ShieldAlert, title: t('notApprovedTitle'), lead: t('notApprovedLead'), tone: 'text-amber-200', ring: 'border-amber-300/40 bg-amber-300/10' },
    unknown: { Icon: ShieldQuestion, title: t('unknownTitle'), lead: t('unknownLead'), tone: 'text-rose-200', ring: 'border-rose-400/40 bg-rose-400/10' },
  }[check.result];
  const { post, source } = check;
  const sourceTitle = source?.isPublic ? (locale === 'hi' && source.title_hi ? source.title_hi : source.title) : null;

  return (
    <div className="relative isolate overflow-hidden">
      <div aria-hidden className="absolute -z-10 -right-64 -top-40 w-[46rem] max-w-none opacity-25 sm:-right-40">
        <PolarGraticule className="w-full h-auto" stations={[]} />
      </div>

      <div className="mx-auto min-h-[80dvh] max-w-3xl px-4 pb-24 pt-14 sm:px-6 sm:pt-20">
        <Link href="/verify" className="micro-cap inline-flex items-center gap-2 text-[var(--glacier)] hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> {t('checkAnother')}
        </Link>

        <header className="rise mt-10 space-y-5">
          <p className="eyebrow tabular">{t('eyebrow', { code: check.code })}</p>
          <div className="flex flex-wrap items-center gap-5">
            <span className={`flex h-16 w-16 items-center justify-center rounded-full border ${view.ring}`}>
              <view.Icon className={`h-8 w-8 ${view.tone}`} aria-hidden />
            </span>
            <h1 className={`text-6xl sm:text-7xl ${view.tone}`}>{view.title}</h1>
          </div>
          <p className="max-w-[58ch] text-lg leading-relaxed text-[var(--snow)]/85">{view.lead}</p>
        </header>

        {post && (
          <section style={{ '--i': 2 } as React.CSSProperties} className="rise mt-12 space-y-6">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-y border-[var(--line)] py-6 text-sm sm:grid-cols-4">
              <div>
                <dt className="micro-cap text-[var(--mist)]">{t('channel')}</dt>
                <dd className="mt-1 text-[var(--snow)]">{t(`ch_${post.channel}`)}</dd>
              </div>
              <div>
                <dt className="micro-cap text-[var(--mist)]">{t('language')}</dt>
                <dd className="mt-1 text-[var(--snow)]">{post.language === 'hi' ? t('langHi') : t('langEn')}</dd>
              </div>
              {post.approvedAt && (
                <div>
                  <dt className="micro-cap text-[var(--mist)]">{t('approvedOn')}</dt>
                  <dd className="mt-1 tabular text-[var(--snow)]">{fmt(post.approvedAt)}</dd>
                </div>
              )}
              <div>
                <dt className="micro-cap text-[var(--mist)]">{t('approvedBy')}</dt>
                <dd className="mt-1 text-[var(--snow)]">{t(ROLE_KEY[post.approverRole ?? ''] ?? 'roleStaff')}</dd>
              </div>
            </dl>

            <figure className="space-y-3">
              <figcaption className="micro-cap text-[var(--mist)]">{t('approvedText')}</figcaption>
              <blockquote
                lang={post.language}
                className={`rounded-md border border-[var(--line)] bg-[var(--navy-raised)] p-6 text-base leading-relaxed text-[var(--snow)] ${LONG_FORM.has(post.channel) ? '' : 'whitespace-pre-wrap'}`}
              >
                {/* Website articles are written in Markdown; social posts are plain text. */}
                {LONG_FORM.has(post.channel) ? <Markdown>{resolveSiteLinks(post.body)}</Markdown> : resolveSiteLinks(post.body)}
                {post.hashtags.length > 0 && <span className="mt-4 block text-[var(--glacier)]">{post.hashtags.join(' ')}</span>}
              </blockquote>
              <p className="text-sm text-[var(--mist)]">{t('compare')}</p>
            </figure>

            {source && (
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="micro-cap text-[var(--mist)]">{t('source')}</span>
                {sourceTitle ? (
                  <Link href={`/asset/${source.id}`} className="inline-flex items-center gap-1 text-[var(--glacier)] hover:underline">
                    {sourceTitle} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                ) : (
                  <span className="text-[var(--snow)]/80">{t('sourcePrivate')}</span>
                )}
              </p>
            )}
          </section>
        )}

        <p className="mt-16 border-t border-[var(--line)] pt-6 text-xs leading-relaxed text-[var(--mist)]">{t('prototypeNote')}</p>
      </div>
    </div>
  );
}
