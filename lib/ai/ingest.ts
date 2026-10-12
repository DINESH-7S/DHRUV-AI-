import 'server-only';
import type { Asset, AssetAIMetadata } from '../types/database';
import { supabaseAdmin } from '../db/admin';
import { ARCHIVE_BUCKET, PUBLIC_BUCKET } from '../db/buckets';
import { isAiMock } from '../env';
import { addUsage, aiProvider, generateStructured, modelName, type TokenUsage } from './llm';
import { formatTimestamp } from '../utils';
import { chunkPages, chunkText, pageMarker } from './chunk';
import { embedTexts, embeddingMode } from './embed';
import { decodeText, extractPdfText, headLines, isPdf, isReadableText, isTextFile } from './extract';
import { buildPreview } from '../datasets/preview';
import { mockDatasetInsights, mockDelay, mockDocumentInsights, mockImageInsights } from './fixtures';
import {
  DATASET_SYSTEM,
  DOCUMENT_SYSTEM,
  IMAGE_SYSTEM,
  METADATA_ONLY_SYSTEM,
  VIDEO_SYSTEM,
  describeAsset,
  type AssetContext,
} from './prompts';
import {
  DatasetInsightsSchema,
  DocumentInsightsSchema,
  ImageInsightsSchema,
  ScannedDocumentSchema,
  VideoInsightsSchema,
  type DocumentInsights,
  type ScannedDocumentInsights,
} from './schemas';

/** ~100k tokens. Longer documents are summarised from their opening section and flagged as truncated. */
const MAX_DOC_CHARS = 400_000;
/**
 * PDFs without usable text are sent to the model to read visually. Claude caps requests at 32 MB;
 * Gemini's Files API accepts up to 50 MB (our upload limit).
 */
function maxVisualPdfBytes(): number {
  // Local open-weight models cannot read PDF pages (no OCR yet): such PDFs are catalogued from metadata.
  const provider = aiProvider();
  return provider === 'ollama' ? 0 : (provider === 'gemini' ? 50 : 30) * 1024 * 1024;
}
const MIN_TEXT_CHARS = 200;
const CHUNK_INSERT_BATCH = 100;

type AssetUpdate = Partial<Omit<Asset, 'ai_metadata'>> & { ai_metadata: AssetAIMetadata };

interface StepResult {
  update: AssetUpdate;
  /** Text to embed for search and Ask Dhruv. */
  chunks: string[];
}

interface IngestContext {
  asset: Asset;
  ctx: AssetContext;
  bytes: Uint8Array | null;
  fileName: string;
  usage: TokenUsage;
  mock: boolean;
}

/**
 * Runs the full AI pipeline for one asset and records progress in ai_jobs.
 * Never publishes: the asset ends in 'ready' for human review (or keeps 'published' on a re-run).
 * Never throws — failures are written to the job row so the UI can show them and retry.
 */
export async function runIngestion(jobId: string, assetId: string): Promise<void> {
  const db = supabaseAdmin();
  const usage: TokenUsage = { input: 0, output: 0 };

  try {
    await db.from('ai_jobs').update({ status: 'processing' }).eq('id', jobId);

    const { data: asset, error } = await db.from('assets').select('*').eq('id', assetId).single<Asset>();
    if (error || !asset) throw new Error(`Asset ${assetId} not found.`);

    const fileName = asset.file_path?.split('/').pop() ?? '';
    const bytes = asset.file_path ? await downloadArchiveFile(asset.file_path) : null;
    const input: IngestContext = {
      asset,
      fileName,
      bytes,
      usage,
      mock: isAiMock(),
      ctx: {
        title: asset.title,
        description: asset.description ?? '',
        type: asset.type,
        region: asset.region,
        year: asset.year,
        authors: asset.authors ?? [],
        fileName,
      },
    };

    const result = await processByKind(input);
    await replaceChunks(asset.id, result.chunks);

    // Source details recorded at import (video, event) are not AI output: keep them.
    const { video, event } = asset.ai_metadata ?? {};
    const { error: updateError } = await db
      .from('assets')
      .update({
        ...result.update,
        ai_metadata: { video, event, ...result.update.ai_metadata, mock: input.mock || undefined },
        status: asset.status === 'published' ? 'published' : 'ready',
      })
      .eq('id', asset.id);
    if (updateError) throw new Error(`Saving AI results failed: ${updateError.message}`);

    await db
      .from('ai_jobs')
      .update({ status: 'completed', tokens_in: usage.input, tokens_out: usage.output, finished_at: new Date().toISOString() })
      .eq('id', jobId);
    await db.from('audit_log').insert({
      action: 'ai_ingest_completed',
      entity: 'assets',
      entity_id: asset.id,
      diff: { job_id: jobId, mock: input.mock, embeddings: embeddingMode(), chunks: result.chunks.length },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[ingest] job ${jobId} for asset ${assetId} failed:`, err);
    await db
      .from('ai_jobs')
      .update({ status: 'failed', error: message, tokens_in: usage.input, tokens_out: usage.output, finished_at: new Date().toISOString() })
      .eq('id', jobId);
    // Back to draft so it is not stuck in 'processing' and can be retried.
    await db.from('assets').update({ status: 'draft' }).eq('id', assetId).eq('status', 'processing');
  }
}

async function processByKind(input: IngestContext): Promise<StepResult> {
  const { asset, bytes, fileName } = input;
  const mime = asset.mime_type ?? '';

  if (asset.type === 'photo' || (bytes && mime.startsWith('image/'))) {
    if (!bytes) throw new Error('Photo asset has no uploaded file.');
    return processImage(input, bytes);
  }
  if (asset.type === 'dataset') return processDataset(input);
  if (asset.type === 'video' && asset.ai_metadata?.video?.youtube_id && aiProvider() === 'gemini') return processVideo(input);
  if (bytes && (isPdf(mime, fileName) || isTextFile(mime, fileName))) return processDocument(input, bytes);
  return processMetadataOnly(input);
}

// ---------------------------------------------------------------------------
// Documents: reports, publications (PDF or text)
// ---------------------------------------------------------------------------

async function processDocument(input: IngestContext, bytes: Uint8Array): Promise<StepResult> {
  const { asset, ctx, fileName } = input;
  const pdf = isPdf(asset.mime_type, fileName);

  let text = '';
  let pages: number | undefined;
  let pageTexts: string[] = [];
  if (pdf) ({ text, pages, pageTexts } = await extractPdfText(bytes));
  else text = decodeText(bytes);

  // Scanned PDFs have no text; legacy-font Hindi PDFs have text that is symbol soup. Both are read visually.
  const hasText = text.length >= MIN_TEXT_CHARS && isReadableText(text);
  const readVisually = !hasText && pdf && bytes.byteLength <= maxVisualPdfBytes();
  const truncated = hasText && text.length > MAX_DOC_CHARS;

  let insights: DocumentInsights;
  let digest: ScannedDocumentInsights['digest_sections'] = [];
  let model = modelName('smart');

  if (input.mock) {
    await mockDelay();
    insights = mockDocumentInsights(ctx, hasText ? text : '');
  } else if (readVisually) {
    const result = await generateStructured({
      patient: true,
      tier: 'smart',
      system: DOCUMENT_SYSTEM,
      schema: ScannedDocumentSchema,
      maxTokens: 24000,
      timeoutMs: 300_000,
      content: [
        { type: 'pdf', data: Buffer.from(bytes).toString('base64') },
        {
          type: 'text',
          text:
            `${describeAsset(ctx)}\n\nThis PDF has no usable text layer (scanned pages or non-Unicode fonts), so read the pages directly. ` +
            'Produce the catalogue entry and a faithful section-by-section digest of the whole document.',
        },
      ],
    });
    addUsage(input.usage, result.usage);
    ({ digest_sections: digest, ...insights } = result.data);
    model = result.model;
  } else {
    const content = hasText
      ? `${describeAsset(ctx)}\n\n<document>\n${text.slice(0, MAX_DOC_CHARS)}\n</document>\n\n` +
        (truncated ? 'Only the opening part of a long document is included above; say so in the summary if it matters.\n\n' : '') +
        'Produce the catalogue entry for this document.'
      : `${describeAsset(ctx)}\n\nNo readable text could be extracted. Produce the catalogue entry from the metadata only.`;
    const result = await generateStructured({ patient: true, tier: 'smart', system: DOCUMENT_SYSTEM, content, schema: DocumentInsightsSchema });
    addUsage(input.usage, result.usage);
    insights = result.data;
    model = result.model;
  }

  const searchText = hasText
    ? pageTexts.length
      ? chunkPages(pageTexts)
      : chunkText(text)
    : digest.map((d) => `${d.page > 0 && pages && d.page <= pages ? pageMarker(d.page) : ''}${asset.title}: ${d.heading}\n${d.text}`);

  return {
    update: {
      ai_summary: insights.summary,
      ai_summary_simple: insights.simple_summary,
      ai_summary_hi: insights.summary_hi,
      ai_keywords: insights.keywords,
      title_hi: asset.title_hi || insights.title_hi,
      discipline: mergeDisciplines(asset.discipline, insights.disciplines),
      ai_metadata: {
        model,
        suggested_title: insights.suggested_title,
        key_findings: insights.key_findings,
        pages,
        truncated: truncated || undefined,
        read_visually: readVisually || undefined,
      },
    },
    chunks: [
      ...searchText,
      `Summary of "${asset.title}": ${insights.summary}`,
      ...(insights.key_findings.length ? [`Key findings of "${asset.title}": ${insights.key_findings.join(' ')}`] : []),
    ],
  };
}

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------

async function processImage(input: IngestContext, bytes: Uint8Array): Promise<StepResult> {
  const { asset, ctx } = input;
  const sharp = (await import('sharp')).default;

  let visionJpeg: Buffer;
  let thumbnail: Buffer;
  let smallThumbnail: Buffer;
  try {
    const base = sharp(bytes, { failOn: 'none' }).rotate();
    // 1568px long edge is the largest size Claude uses without downscaling.
    visionJpeg = await base.clone().resize(1568, 1568, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
    // 1280px: sharp enough for the large photo tiles on the home page and gallery.
    thumbnail = await base.clone().resize(1280, 1280, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 76 }).toBuffer();
    // 640px: grids and cards (smallThumbnail() in lib/utils), a tenth of the bytes on phones.
    smallThumbnail = await base.clone().resize(640, 640, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 72 }).toBuffer();
  } catch {
    throw new Error('This image format could not be read. Upload a JPG, PNG or WebP.');
  }

  let insights;
  let model = modelName('fast');
  if (input.mock) {
    await mockDelay();
    insights = mockImageInsights(ctx);
  } else {
    const result = await generateStructured({ patient: true,
      tier: 'fast',
      system: IMAGE_SYSTEM,
      schema: ImageInsightsSchema,
      maxTokens: 4000,
      content: [
        { type: 'image', mediaType: 'image/jpeg', data: visionJpeg.toString('base64') },
        { type: 'text', text: `${describeAsset(ctx)}\n\nDescribe this photograph for the public gallery.` },
      ],
    });
    addUsage(input.usage, result.usage);
    insights = result.data;
    model = result.model;
  }

  return {
    update: {
      ai_caption: insights.caption,
      alt_text: insights.alt_text,
      ai_summary: insights.caption,
      ai_summary_simple: insights.caption,
      ai_summary_hi: insights.caption_hi,
      ai_keywords: insights.tags,
      title_hi: asset.title_hi || insights.title_hi,
      discipline: mergeDisciplines(asset.discipline, insights.disciplines),
      // Restricted photos never get a public thumbnail.
      thumbnail: asset.access_level === 'public' ? await uploadThumbnail(asset.id, thumbnail, smallThumbnail) : asset.thumbnail,
      ai_metadata: {
        model,
        location_guess: insights.location_guess,
        is_suitable_for_social: insights.is_suitable_for_social,
      },
    },
    chunks: [`Photograph "${asset.title}". ${insights.caption} Shows: ${insights.alt_text}. Tags: ${insights.tags.join(', ')}.`],
  };
}

// ---------------------------------------------------------------------------
// Datasets (CSV/TSV/JSON get a data sample; NetCDF/ZIP are described from metadata)
// ---------------------------------------------------------------------------

async function processDataset(input: IngestContext): Promise<StepResult> {
  const { asset, ctx, bytes, fileName } = input;
  const sample = bytes && isTextFile(asset.mime_type, fileName) ? headLines(decodeText(bytes)) : '';

  let insights;
  let model = modelName('fast');
  if (input.mock) {
    await mockDelay();
    insights = mockDatasetInsights(ctx, sample);
  } else {
    const content =
      `${describeAsset(ctx)}\n\n` +
      (sample
        ? `<sample note="first rows of the file">\n${sample}\n</sample>`
        : 'The file is in a binary format (e.g. NetCDF or ZIP), so no data sample is available.') +
      '\n\nProduce the catalogue entry for this dataset.';
    const result = await generateStructured({ patient: true, tier: 'fast', system: DATASET_SYSTEM, content, schema: DatasetInsightsSchema, maxTokens: 6000 });
    addUsage(input.usage, result.usage);
    insights = result.data;
    model = result.model;
  }

  const variableList = insights.variables.map((v) => `${v.name} (${v.unit}): ${v.description}`).join('; ');
  // Table and chart for the dataset page, computed once here so the page never downloads the file.
  const units = Object.fromEntries(insights.variables.filter((v) => v.unit && v.unit !== 'unknown').map((v) => [v.name, v.unit]));
  const preview = bytes && isTextFile(asset.mime_type, fileName) && /\.csv$/i.test(fileName ?? asset.file_path ?? '') ? buildPreview(decodeText(bytes), units) : null;
  return {
    update: {
      ai_summary: insights.summary,
      ai_summary_simple: insights.simple_summary,
      ai_summary_hi: insights.summary_hi,
      ai_keywords: insights.keywords,
      title_hi: asset.title_hi || insights.title_hi,
      discipline: mergeDisciplines(asset.discipline, insights.disciplines),
      ai_metadata: {
        model,
        variables: insights.variables,
        temporal_coverage: insights.temporal_coverage,
        spatial_coverage: insights.spatial_coverage,
        ...(preview ? { preview } : {}),
      },
    },
    chunks: [
      `Dataset "${asset.title}". ${insights.summary}` +
        (variableList ? ` Variables: ${variableList}.` : '') +
        ` Time coverage: ${insights.temporal_coverage}. Spatial coverage: ${insights.spatial_coverage}.`,
    ],
  };
}

// ---------------------------------------------------------------------------
// Videos (YouTube, watched by Gemini): summaries, chapters, timestamped digest
// ---------------------------------------------------------------------------

/** Long event recordings are analysed from the start only (free-tier limits); the page says so. */
const MAX_VIDEO_SECONDS = 30 * 60;
const LONG_VIDEO_SECONDS = 45 * 60;

async function processVideo(input: IngestContext): Promise<StepResult> {
  const { asset, ctx } = input;
  const video = asset.ai_metadata!.video!;
  const endSec = video.duration_s > LONG_VIDEO_SECONDS ? MAX_VIDEO_SECONDS : undefined;

  if (input.mock) return processMetadataOnly(input);

  const result = await generateStructured({
    patient: true,
    tier: 'smart',
    system: VIDEO_SYSTEM,
    schema: VideoInsightsSchema,
    maxTokens: 24000,
    timeoutMs: 300_000,
    content: [
      { type: 'youtube', url: `https://www.youtube.com/watch?v=${video.youtube_id}`, endSec },
      {
        type: 'text',
        text:
          `${describeAsset(ctx)}\n\n` +
          (endSec ? `This is a long recording; only the first ${endSec / 60} minutes are provided. Say so in the summary.\n\n` : '') +
          'Produce the catalogue entry, chapters and timestamped digest for this video.',
      },
    ],
  });
  addUsage(input.usage, result.usage);
  const insights = result.data;
  const limit = endSec ?? video.duration_s;
  const inRange = (s: number) => s >= 0 && s <= limit;
  const chapters = insights.chapters.filter((c) => inRange(c.start_s)).sort((a, b) => a.start_s - b.start_s);
  const transcript = insights.transcript.filter((t) => inRange(t.start_s)).sort((a, b) => a.start_s - b.start_s);

  return {
    update: {
      ai_summary: insights.summary,
      ai_summary_simple: insights.simple_summary,
      ai_summary_hi: insights.summary_hi,
      ai_keywords: insights.keywords,
      title_hi: asset.title_hi || insights.title_hi,
      discipline: mergeDisciplines(asset.discipline, insights.disciplines),
      ai_metadata: {
        model: result.model,
        suggested_title: insights.suggested_title,
        key_findings: insights.key_findings,
        chapters,
        analysed_seconds: endSec,
      },
    },
    // "[m:ss]" prefixes let Ask Dhruv link a citation to the moment in the video.
    chunks: [
      ...transcript.map((t) => `[${formatTimestamp(t.start_s)}] Video "${asset.title}": ${t.text}`),
      `Summary of the video "${asset.title}": ${insights.summary}`,
      ...(insights.key_findings.length ? [`Key points of the video "${asset.title}": ${insights.key_findings.join(' ')}`] : []),
    ],
  };
}

// ---------------------------------------------------------------------------
// Videos (other providers), events, news — title and description only
// ---------------------------------------------------------------------------

async function processMetadataOnly(input: IngestContext): Promise<StepResult> {
  const { asset, ctx } = input;

  let insights;
  let model = modelName('fast');
  if (input.mock) {
    await mockDelay();
    insights = mockDocumentInsights(ctx, '');
  } else {
    const result = await generateStructured({ patient: true,
      tier: 'fast',
      system: METADATA_ONLY_SYSTEM,
      schema: DocumentInsightsSchema,
      maxTokens: 6000,
      content: `${describeAsset(ctx)}\n\nProduce the catalogue entry for this ${asset.type}.`,
    });
    addUsage(input.usage, result.usage);
    insights = result.data;
    model = result.model;
  }

  return {
    update: {
      ai_summary: insights.summary,
      ai_summary_simple: insights.simple_summary,
      ai_summary_hi: insights.summary_hi,
      ai_keywords: insights.keywords,
      title_hi: asset.title_hi || insights.title_hi,
      discipline: mergeDisciplines(asset.discipline, insights.disciplines),
      ai_metadata: { model, suggested_title: insights.suggested_title, key_findings: insights.key_findings },
    },
    chunks: [`${asset.type} "${asset.title}". ${asset.description ?? ''} ${insights.summary}`.trim()],
  };
}

// ---------------------------------------------------------------------------
// Storage + database helpers
// ---------------------------------------------------------------------------

async function downloadArchiveFile(path: string): Promise<Uint8Array> {
  const { data, error } = await supabaseAdmin().storage.from(ARCHIVE_BUCKET).download(path);
  if (error || !data) throw new Error(`Could not download the uploaded file (${path}): ${error?.message ?? 'not found'}.`);
  return new Uint8Array(await data.arrayBuffer());
}

async function uploadThumbnail(assetId: string, webp: Buffer, small: Buffer): Promise<string> {
  const path = `thumbnails/${assetId}.webp`;
  const storage = supabaseAdmin().storage.from(PUBLIC_BUCKET);
  const { error: smallError } = await storage.upload(`thumbnails/${assetId}-640.webp`, small, { contentType: 'image/webp', upsert: true });
  if (smallError) throw new Error(`Thumbnail upload failed: ${smallError.message}`);
  const { error } = await storage.upload(path, webp, { contentType: 'image/webp', upsert: true });
  if (error) throw new Error(`Thumbnail upload failed: ${error.message}`);
  return storage.getPublicUrl(path).data.publicUrl;
}

async function replaceChunks(assetId: string, chunks: string[]): Promise<void> {
  const db = supabaseAdmin();
  const texts = chunks.map((c) => c.trim()).filter(Boolean);
  const embeddings = await embedTexts(texts, 'document');

  const { error: deleteError } = await db.from('asset_chunks').delete().eq('asset_id', assetId);
  if (deleteError) throw new Error(`Clearing old chunks failed: ${deleteError.message}`);

  const rows = texts.map((content, i) => ({ asset_id: assetId, chunk_index: i, content, embedding: embeddings[i] }));
  for (let i = 0; i < rows.length; i += CHUNK_INSERT_BATCH) {
    const { error } = await db.from('asset_chunks').insert(rows.slice(i, i + CHUNK_INSERT_BATCH));
    if (error) throw new Error(`Saving search chunks failed: ${error.message}`);
  }
}

function mergeDisciplines(existing: string[] | undefined, fromAi: readonly string[]): string[] {
  return [...new Set([...(existing ?? []), ...fromAi])];
}
