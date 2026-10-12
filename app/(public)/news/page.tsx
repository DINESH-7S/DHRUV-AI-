import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Newspaper, Calendar, ArrowRight } from 'lucide-react';
import { getTranslations, getLocale } from 'next-intl/server';
import { fetchContentPosts } from '@/lib/db/supabase';
import { formatDate } from '@/lib/utils';
import Markdown from '@/components/shared/Markdown';
import { resolveSiteLinks } from '@/lib/site';
import { PageBand } from '@/components/public/PageBand';
import { Reveal, Stagger, StaggerItem } from '@/components/motion/Reveal';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('news');
  const hi = (await getLocale()) === 'hi';
  return {
    title: t('title'),
    description: t('subtitle'),
    alternates: { types: { 'application/rss+xml': hi ? '/news/rss.xml?lang=hi' : '/news/rss.xml' } },
  };
}

export default async function NewsPage() {
  const t = await getTranslations('news');
  const locale = await getLocale();

  // fetchContentPosts returns published posts only. Website news = blog posts and press releases.
  const websitePosts = (await fetchContentPosts()).filter(p => p.channel === 'blog' || p.channel === 'press_release');
  // Prefer posts in the visitor's language; fall back to everything if none exist in it yet.
  const inLocale = websitePosts.filter(p => p.language === locale);
  const newsPosts = inLocale.length ? inLocale : websitePosts;

  return (
    <>
    <PageBand
      band="news"
      eyebrow={<><Newspaper className="w-4 h-4" aria-hidden /> <span>{t('badge')}</span></>}
      title={t('title')}
      subtitle={t('subtitle')}
    >
      <a href={locale === 'hi' ? '/news/rss.xml?lang=hi' : '/news/rss.xml'} className="btn-ghost">
        {t('rss')}
      </a>
    </PageBand>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-10">

      {/* News Feed Grid */}
      {newsPosts.length === 0 ? (
        <div className="py-16 text-center space-y-3 border-y border-[var(--line)]">
          <Newspaper className="w-8 h-8 text-[var(--mist)] mx-auto" />
          <h3 className="text-xl font-semibold text-[var(--snow)]">{t('emptyTitle')}</h3>
          <p className="text-sm text-[var(--mist)] max-w-sm mx-auto">
            {t('emptySubtitle')}
          </p>
        </div>
      ) : (
        <Stagger className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {newsPosts.map((post, idx) => (
            <StaggerItem key={post.id || idx}>
              <article className="spotlight group rounded-2xl border border-[var(--line)] bg-[var(--navy-raised)] p-6 space-y-4 flex flex-col justify-between hover:border-[var(--glacier)]/40 transition-colors">
                <div className="space-y-4">
                  {/* Meta Header */}
                  <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
                    <span className="px-2.5 py-1 rounded-md bg-[var(--glacier)]/10 border border-[var(--glacier)]/30 text-[10px] font-bold uppercase text-[var(--glacier)]">
                      {post.channel === 'press_release' ? t('pressBadge') : t('blogBadge')}
                    </span>
                    <div className="flex items-center space-x-1.5 text-xs text-[var(--mist)] tabular">
                      <Calendar className="w-3.5 h-3.5 text-[var(--glacier)]" />
                      <span>{formatDate(post.published_at ?? post.created_at)}</span>
                    </div>
                  </div>

                  {/* Content Image if available */}
                  {post.image_url && (
                    <div className="h-56 rounded-xl overflow-hidden bg-[var(--ink)] border border-[var(--line)] relative">
                      <img
                        src={post.image_url}
                        alt="News Cover"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  )}

                  {/* Post Body rendered as Markdown */}
                  <div className="space-y-2">
                    <div lang={post.language}>
                      <Markdown className="font-sans text-[var(--mist)] text-xs leading-relaxed">
                        {resolveSiteLinks(post.body)}
                      </Markdown>
                    </div>
                  </div>

                  {/* Hashtags */}
                  {post.hashtags && post.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {post.hashtags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 rounded bg-[var(--ink)] border border-[var(--line)] text-[10px] text-[var(--glacier)] font-mono">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="pt-4 border-t border-[var(--line)] flex items-center justify-between text-xs">
                  <span className="text-[var(--mist)]">{post.reviewer_id ? t('source') : t('sourceUnreviewed')}</span>
                  <Link href={`/asset/${post.asset_id}`} className="text-[var(--glacier)] font-medium hover:underline flex items-center space-x-1">
                    <span>{t('viewAsset')}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </article>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
    </>
  );
}

