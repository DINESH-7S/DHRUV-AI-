import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { after } from 'next/server';
import { cache } from 'react';
import { getLocale } from 'next-intl/server';
import { siteUrl } from '@/lib/site';
import AssetDetailView from '@/components/public/AssetDetailView';
import { getAssetForViewer, getMediaLinks, getRelatedAssets, resolveViewer, signedFileUrl, trackAssetEvent } from '@/lib/db/assets';
import type { Asset } from '@/lib/types/database';
import { fetchExpeditions } from '@/lib/db/supabase';
import { isSourced } from '@/lib/expeditions';
import { humanCheckedIds } from '@/lib/db/review';

type Props = { params: Promise<{ id: string }> };

// Shared by generateMetadata and the page so auth + the asset query run once per request.
const loadAsset = cache(async (id: string) => {
  const viewer = await resolveViewer();
  const asset = await getAssetForViewer(id, viewer);
  return { viewer, asset };
});

const SITE_URL = siteUrl();

function describe(asset: Asset): string {
  return (asset.ai_summary_simple || asset.ai_summary || asset.description || asset.title).slice(0, 160);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { asset } = await loadAsset(id);
  if (!asset) return { title: '404' };

  const locale = await getLocale();
  const description = describe(asset);
  return {
    title: locale === 'hi' && asset.title_hi ? asset.title_hi : asset.title,
    description,
    keywords: asset.ai_keywords,
    alternates: { canonical: `${SITE_URL}/asset/${asset.id}` },
    openGraph: {
      title: asset.title,
      description,
      type: 'article',
      url: `${SITE_URL}/asset/${asset.id}`,
      images: asset.thumbnail ? [{ url: asset.thumbnail, alt: asset.alt_text ?? asset.title }] : undefined,
    },
    // Drafts are only visible to staff; keep them out of search engines regardless.
    robots: asset.status === 'published' ? undefined : { index: false, follow: false },
  };
}

const SCHEMA_TYPE: Record<Asset['type'], string> = {
  report: 'Report',
  publication: 'ScholarlyArticle',
  dataset: 'Dataset',
  photo: 'ImageObject',
  video: 'VideoObject',
  event: 'Event',
  news: 'NewsArticle',
};

/** "CC-BY-NC-4.0" → https://creativecommons.org/licenses/by-nc/4.0/; other licenses pass through as text. */
function licenseUrl(license: string | undefined): string | undefined {
  const cc = license?.match(/^CC-([A-Z-]+?)-(\d\.\d)$/i);
  return cc ? `https://creativecommons.org/licenses/${cc[1].toLowerCase()}/${cc[2]}/` : license;
}

/** Author strings that name an organisation rather than a person. */
const ORG_NAME = /centre|center|institute|ministry|survey|university|agency|council|NCPOR|NSIDC|department|laboratory/i;

function jsonLd(asset: Asset) {
  return {
    '@context': 'https://schema.org',
    '@type': SCHEMA_TYPE[asset.type],
    name: asset.title,
    alternateName: asset.title_hi || undefined,
    description: asset.ai_summary || asset.description,
    url: `${SITE_URL}/asset/${asset.id}`,
    keywords: asset.ai_keywords?.join(', '),
    author: asset.authors?.filter(Boolean).map((name) => ({ '@type': ORG_NAME.test(name) ? 'Organization' : 'Person', name })),
    datePublished: asset.published_at ?? String(asset.year),
    license: licenseUrl(asset.license),
    image: asset.thumbnail,
    inLanguage: ['en', 'hi'],
    identifier: asset.doi ? `https://doi.org/${asset.doi}` : undefined,
    // No `publisher`: DHRUV is a prototype and many items are third-party works; the credited
    // authors and licence above are the only attributions we can state as fact.
  };
}

function previewKind(asset: Asset): 'pdf' | 'image' | 'video' | null {
  const mime = asset.mime_type ?? '';
  if (mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  return null;
}

export default async function AssetDetailPage({ params, searchParams }: Props & { searchParams: Promise<{ t?: string; page?: string }> }) {
  const { id } = await params;
  const { t, page } = await searchParams;
  const { viewer, asset } = await loadAsset(id);
  if (!asset) notFound();

  const kind = previewKind(asset);
  const [related, previewUrl, media, expeditions, checked] = await Promise.all([
    getRelatedAssets(asset, viewer),
    kind ? signedFileUrl(asset) : Promise.resolve(null),
    getMediaLinks(asset, viewer),
    asset.expedition_id ? fetchExpeditions() : Promise.resolve([]),
    humanCheckedIds([asset.id]),
  ]);
  const exp = expeditions.find((e) => e.id === asset.expedition_id && isSourced(e));
  // ?t=195 (from an Ask Dhruv citation) starts the video at that moment.
  const startAt = t && /^\d{1,5}$/.test(t) ? Number(t) : undefined;
  // ?page=12 (from an Ask Dhruv citation) opens the PDF at that page.
  const startPage = page && /^\d{1,4}$/.test(page) && Number(page) > 0 ? Number(page) : undefined;

  if (asset.status === 'published' && !viewer.isStaff) {
    after(() => trackAssetEvent(asset.id, 'view'));
  }

  return (
    <>
      {asset.status === 'published' && (
        <script
          type="application/ld+json"
          // JSON.stringify output cannot close the script tag once "<" is escaped.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(asset)).replace(/</g, '\\u003c') }}
        />
      )}
      <AssetDetailView
        asset={asset}
        related={related.items}
        relatedMethod={related.method}
        isStaffPreview={viewer.isStaff && asset.status !== 'published'}
        preview={kind && previewUrl ? { kind, url: previewUrl } : null}
        media={media}
        startAt={startAt}
        startPage={startPage}
        expedition={exp ? { code: exp.code, name: exp.name, name_hi: exp.name_hi ?? null } : null}
        staffChecked={checked.has(asset.id)}
      />
    </>
  );
}
