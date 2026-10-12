import * as z from 'zod/v4';

// Structured-output schemas. Keep them free of min/max/regex constraints: length and
// count guidance lives in .describe() so the JSON schema sent to Claude stays simple.

export const DISCIPLINES = [
  'glaciology',
  'oceanography',
  'atmospheric_science',
  'climate_science',
  'marine_biology',
  'terrestrial_biology',
  'geology',
  'geophysics',
  'sea_ice',
  'paleoclimate',
  'remote_sensing',
  'human_physiology',
  'logistics',
  'outreach',
] as const;

const Discipline = z.enum(DISCIPLINES);

export const DocumentInsightsSchema = z.object({
  summary: z.string().describe('Scientific summary for researchers, 150-250 words, English.'),
  simple_summary: z.string().describe('Plain-language summary a class 8 student understands, 80-120 words, English.'),
  summary_hi: z.string().describe('Hindi (Devanagari) translation of simple_summary.'),
  title_hi: z.string().describe('Hindi (Devanagari) translation of the document title.'),
  suggested_title: z.string().describe('Clear, specific English title if the given one is vague; otherwise repeat the given title.'),
  keywords: z.array(z.string()).describe('8-12 lowercase search keywords or short phrases.'),
  disciplines: z.array(Discipline).describe('1-3 disciplines this document belongs to.'),
  key_findings: z.array(z.string()).describe('3-5 key findings or facts, one sentence each, stated only if present in the source.'),
});
export type DocumentInsights = z.infer<typeof DocumentInsightsSchema>;

/**
 * For PDFs without a usable text layer (scanned, or legacy Hindi fonts) the model reads the pages
 * and also writes a faithful digest, which becomes the searchable text for Ask Dhruv.
 */
export const ScannedDocumentSchema = DocumentInsightsSchema.extend({
  digest_sections: z
    .array(
      z.object({
        heading: z.string().describe('Section or chapter heading as it appears in the document.'),
        page: z.number().int().describe('PDF page number (1 = first page of the file) where this section starts.'),
        text: z
          .string()
          .describe('Faithful 80-200 word digest of this section in English, keeping concrete facts (numbers, names, places, dates) exactly as written.'),
      }),
    )
    .describe('10-25 sections covering the whole document in reading order.'),
});
export type ScannedDocumentInsights = z.infer<typeof ScannedDocumentSchema>;

/** For videos the model watches: the catalogue entry plus chapters and a timestamped digest for search and citations. */
export const VideoInsightsSchema = DocumentInsightsSchema.extend({
  chapters: z
    .array(
      z.object({
        start_s: z.number().int().describe('Chapter start, in whole seconds from the beginning of the video.'),
        title: z.string().describe('Short English chapter title, 2-7 words.'),
        title_hi: z.string().describe('Hindi (Devanagari) translation of the chapter title.'),
      }),
    )
    .describe('4-10 chapters in order, the first starting at 0. Fewer for very short videos.'),
  transcript: z
    .array(
      z.object({
        start_s: z.number().int().describe('Start of this passage, in whole seconds.'),
        text: z
          .string()
          .describe('Faithful 40-120 word English digest of what is said and shown in this passage, keeping names, places, numbers and dates exactly as spoken or shown on screen.'),
      }),
    )
    .describe('Passages covering the whole analysed video in order, roughly one per 45-90 seconds.'),
});
export type VideoInsights = z.infer<typeof VideoInsightsSchema>;

export const ImageInsightsSchema = z.object({
  caption: z.string().describe('Engaging 1-2 sentence caption for the public gallery, English.'),
  caption_hi: z.string().describe('Hindi (Devanagari) translation of caption.'),
  alt_text: z.string().describe('Literal screen-reader description of what is visible, under 125 characters.'),
  title_hi: z.string().describe('Hindi (Devanagari) translation of the image title.'),
  tags: z.array(z.string()).describe('6-10 lowercase tags: subjects, setting, activity, equipment.'),
  disciplines: z.array(Discipline).describe('0-2 relevant disciplines.'),
  location_guess: z.string().describe('Likely setting based on visible evidence and metadata, or "unknown".'),
  is_suitable_for_social: z.boolean().describe('True if the image is visually strong and safe to post on public social media.'),
});
export type ImageInsights = z.infer<typeof ImageInsightsSchema>;

export const DatasetInsightsSchema = z.object({
  summary: z.string().describe('What the dataset contains and how it could be used, 80-150 words, English.'),
  simple_summary: z.string().describe('Plain-language explanation for students, 50-80 words, English.'),
  summary_hi: z.string().describe('Hindi (Devanagari) translation of simple_summary.'),
  title_hi: z.string().describe('Hindi (Devanagari) translation of the dataset title.'),
  keywords: z.array(z.string()).describe('6-10 lowercase search keywords.'),
  disciplines: z.array(Discipline).describe('1-3 disciplines.'),
  variables: z
    .array(
      z.object({
        name: z.string().describe('Column or variable name exactly as in the data.'),
        description: z.string().describe('What it measures.'),
        unit: z.string().describe('Unit of measurement, or "unknown".'),
      }),
    )
    .describe('Variables/columns visible in the sample. Empty if no sample was provided.'),
  temporal_coverage: z.string().describe('Time range covered, or "unknown".'),
  spatial_coverage: z.string().describe('Locations or region covered, or "unknown".'),
});
export type DatasetInsights = z.infer<typeof DatasetInsightsSchema>;
