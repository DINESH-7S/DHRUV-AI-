import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Image as ImageIcon, Play } from 'lucide-react';
import { getTranslations, getLocale } from 'next-intl/server';
import { fetchAssets } from '@/lib/db/supabase';
import { smallThumbnail } from '@/lib/utils';
import { PageBand } from '@/components/public/PageBand';
import { Reveal, Stagger, StaggerItem } from '@/components/motion/Reveal';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('gallery');
  return { title: t('title'), description: t('subtitle') };
}

export default async function GalleryPage() {
  const t = await getTranslations('gallery');
  const tRegions = await getTranslations('regions');
  const locale = await getLocale();

  const [photos, videos] = await Promise.all([fetchAssets({ type: 'photo' }), fetchAssets({ type: 'video' })]);
  // Photos lead; videos (also on /videos) follow, so the gallery stays a photo gallery first.
  const media = [...photos, ...videos];

  return (
    <>
    <PageBand band="gallery" eyebrow={t('badge')} title={t('title')} subtitle={t('subtitle')} />
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-10">

      {media.length === 0 ? (
        <div className="py-16 text-center space-y-3 border-y border-[var(--line)]">
          <ImageIcon className="w-8 h-8 text-[var(--mist)] mx-auto" />
          <h2 className="text-xl font-semibold">{t('emptyTitle')}</h2>
          <p className="text-[var(--mist)] max-w-sm mx-auto">{t('emptySubtitle')}</p>
        </div>
      ) : (
        <Stagger className="columns-1 sm:columns-2 lg:columns-3 gap-5 [&>*]:mb-5">
          {media.map((asset, index) => {
            const title = locale === 'hi' && asset.title_hi ? asset.title_hi : asset.title;
            // For photos the ingestion pipeline stores the Hindi caption in ai_summary_hi.
            const caption = locale === 'hi' ? asset.ai_summary_hi || asset.ai_caption : asset.ai_caption;
            const author = asset.authors?.filter(Boolean)[0];
            return (
              <StaggerItem key={asset.id} className="break-inside-avoid">
                <Link
                  href={`/asset/${asset.id}`}
                  className="spotlight group block overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--navy-raised)] hover:border-[var(--glacier)]/40"
                >
                  <div className="relative overflow-hidden bg-[var(--ink)]">
                    {asset.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={smallThumbnail(asset.thumbnail)}
                        alt={asset.alt_text || title}
                        // The first photo is the largest paint on phones: fetch it first. The rest load
                        // lazily (on wide screens the browser still fetches the visible first row at once).
                        loading={index === 0 ? 'eager' : 'lazy'}
                        fetchPriority={index === 0 ? 'high' : 'auto'}
                        decoding="async"
                        className="w-full h-auto object-cover transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="aspect-[4/3] flex items-center justify-center text-[var(--mist)]">
                        <ImageIcon className="w-8 h-8" aria-hidden />
                      </div>
                    )}
                    {asset.type === 'video' && (
                      <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
                        <span className="w-14 h-14 rounded-full bg-[var(--ink)]/80 flex items-center justify-center">
                          <Play className="w-6 h-6 text-[var(--snow)]" />
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="p-4 space-y-2">
                    <h2 className="text-base font-semibold leading-snug line-clamp-2 group-hover:text-[var(--glacier)]" lang={locale === 'hi' && asset.title_hi ? 'hi' : undefined}>
                      {title}
                    </h2>
                    {caption && (
                      <p className="text-sm text-[var(--mist)] leading-relaxed line-clamp-2" lang={locale === 'hi' && asset.ai_summary_hi ? 'hi' : undefined}>
                        {caption}
                      </p>
                    )}
                    <div className="flex items-center justify-between gap-3 border-t border-[var(--line)] pt-2 text-xs text-[var(--mist)]">
                      <span className="truncate">{author ? t('photoBy', { author }) : ''}</span>
                      <span className="whitespace-nowrap tabular">{tRegions(asset.region)}, {asset.year}</span>
                    </div>
                  </div>
                </Link>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}
    </div>
    </>
  );
}
