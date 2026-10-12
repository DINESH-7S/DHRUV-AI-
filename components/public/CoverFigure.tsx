import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import type { Asset } from '@/lib/types/database';
import { fetchAssetsByIds, fetchAssetsByThumbnail } from '@/lib/db/supabase';
import { smallThumbnail } from '@/lib/utils';

/** Resolves cover photos for records that point at an archive asset (or, before migration 05, at its thumbnail URL). */
export async function resolveCovers<T extends { id: string; cover_asset_id?: string | null }>(
  records: T[],
  legacyUrl: (record: T) => string | null | undefined,
): Promise<Map<string, Asset>> {
  const [byId, byThumb] = await Promise.all([
    fetchAssetsByIds(records.map(r => r.cover_asset_id ?? '')),
    fetchAssetsByThumbnail(records.filter(r => !r.cover_asset_id).map(r => legacyUrl(r) ?? '')),
  ]);
  const covers = new Map<string, Asset>();
  for (const r of records) {
    const asset = (r.cover_asset_id && byId.get(r.cover_asset_id)) || byThumb.get(legacyUrl(r) ?? '');
    if (asset) covers.set(r.id, asset);
  }
  return covers;
}

/**
 * An archive photo with its credit: what it shows, when, who took it, under which licence.
 * Covers are never stock imagery; a record without an archive photo simply has no cover.
 */
export async function CoverFigure({ asset, className = '' }: { asset: Asset; className?: string }) {
  const t = await getTranslations('cover');
  const locale = await getLocale();
  const title = locale === 'hi' && asset.title_hi ? asset.title_hi : asset.title;
  const credit = [asset.authors?.filter(Boolean).join(', '), asset.license].filter(Boolean).join(' - ');
  if (!asset.thumbnail) return null;

  return (
    <figure className={`space-y-2 ${className}`}>
      <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--ink)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={smallThumbnail(asset.thumbnail)} alt={asset.alt_text || title} loading="lazy" className="w-full h-full object-cover aspect-[16/9]" />
      </div>
      <figcaption className="text-xs text-[var(--mist)] leading-relaxed">
        <Link href={`/asset/${asset.id}`} className="hover:text-[var(--snow)] underline-offset-2 hover:underline">
          {t('photo')}: {title}{asset.year ? ` (${asset.year})` : ''}
        </Link>
        {credit && <span className="text-[var(--mist)]"> - {credit}</span>}
      </figcaption>
    </figure>
  );
}
