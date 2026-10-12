import 'server-only';
import type { DatasetInsights, DocumentInsights, ImageInsights } from './schemas';
import type { AssetContext } from './prompts';

// AI_MOCK=true responses. Built from the asset's own metadata and text so the demo
// looks plausible, and flagged with ai_metadata.mock = true so nobody mistakes them for AI output.

const STOPWORDS = new Set(
  'the and for with that this from are was were been have has had its into their there which about than then them they also such over under between during after before these those while where when what will would could should can may more most other some only very report data study india indian ncpor'.split(' '),
);

export async function mockDelay(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 800));
}

function sentences(text: string, count: number): string {
  const found = text.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]/g) ?? [];
  return found.slice(0, count).join(' ').trim();
}

function topKeywords(text: string, count: number): string[] {
  const freq = new Map<string, number>();
  for (const word of text.toLowerCase().match(/[a-z]{4,}/g) ?? []) {
    if (!STOPWORDS.has(word)) freq.set(word, (freq.get(word) ?? 0) + 1);
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, count).map(([word]) => word);
}

function hindiSummary(asset: AssetContext): string {
  return `यह सामग्री "${asset.title}" राष्ट्रीय ध्रुवीय एवं समुद्री अनुसंधान केंद्र (NCPOR) के ध्रुवीय अनुसंधान से संबंधित है। (डेमो मोड: यह सारांश AI द्वारा नहीं बनाया गया है।)`;
}

export function mockDocumentInsights(asset: AssetContext, text: string): DocumentInsights {
  const source = text || asset.description || asset.title;
  const summary = sentences(source, 5) || source.slice(0, 900);
  return {
    summary,
    simple_summary: sentences(source, 2) || asset.description || asset.title,
    summary_hi: hindiSummary(asset),
    title_hi: asset.title,
    suggested_title: asset.title,
    keywords: topKeywords(`${asset.title} ${source}`, 10),
    disciplines: ['climate_science'],
    key_findings: (source.match(/[^.!?]+[.!?]/g) ?? []).slice(0, 3).map((s) => s.trim()),
  };
}

export function mockImageInsights(asset: AssetContext): ImageInsights {
  return {
    caption: asset.description || `${asset.title} — from India's polar research programme.`,
    caption_hi: hindiSummary(asset),
    alt_text: `Photograph: ${asset.title}`.slice(0, 120),
    title_hi: asset.title,
    tags: topKeywords(`${asset.title} ${asset.description} ${asset.region} expedition`, 8),
    disciplines: [],
    location_guess: asset.region,
    is_suitable_for_social: true,
  };
}

export function mockDatasetInsights(asset: AssetContext, sample: string): DatasetInsights {
  const header = sample.split('\n')[0] ?? '';
  const columns = header.includes(',') ? header.split(',') : header.split('\t');
  return {
    summary: asset.description || `Dataset: ${asset.title}.`,
    simple_summary: asset.description || asset.title,
    summary_hi: hindiSummary(asset),
    title_hi: asset.title,
    keywords: topKeywords(`${asset.title} ${asset.description}`, 8),
    disciplines: ['climate_science'],
    variables: sample
      ? columns.filter(Boolean).slice(0, 20).map((name) => ({ name: name.trim(), description: 'Column from the uploaded file', unit: 'unknown' }))
      : [],
    temporal_coverage: String(asset.year),
    spatial_coverage: asset.region,
  };
}
