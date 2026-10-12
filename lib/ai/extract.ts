import 'server-only';

export interface ExtractedText {
  text: string;
  pages: number;
  /** Text of each page, for page-numbered chunks. */
  pageTexts: string[];
}

/** Collapses the whitespace noise PDF extraction leaves behind while keeping paragraph breaks. */
export function normalizeText(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function extractPdfText(bytes: Uint8Array): Promise<ExtractedText> {
  const { extractText, getDocumentProxy } = await import('unpdf');
  // pdf.js may detach the buffer it is given, so hand it a copy.
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { totalPages, text } = await extractText(pdf, { mergePages: false });
  const pageTexts = text.map(normalizeText);
  return { text: normalizeText(pageTexts.join('\n\n')), pages: totalPages, pageTexts };
}

/**
 * False for extracted text that is mostly symbols, e.g. Hindi PDFs set in legacy (non-Unicode)
 * fonts, which extract as punctuation soup. Such PDFs must be read visually instead.
 */
export function isReadableText(text: string): boolean {
  const visible = text.replace(/\s+/g, '');
  if (!visible.length) return false;
  const letters = (visible.match(/\p{L}/gu) ?? []).length;
  return letters / visible.length >= 0.6;
}

export function decodeText(bytes: Uint8Array): string {
  return normalizeText(new TextDecoder('utf-8', { fatal: false }).decode(bytes));
}

const TEXT_MIME = /^(text\/|application\/(json|xml|csv|x-ndjson))/;
const TEXT_EXT = /\.(txt|md|csv|tsv|json|xml|geojson)$/i;

export function isTextFile(mimeType: string | null | undefined, fileName: string): boolean {
  return (!!mimeType && TEXT_MIME.test(mimeType)) || TEXT_EXT.test(fileName);
}

export function isPdf(mimeType: string | null | undefined, fileName: string): boolean {
  return mimeType === 'application/pdf' || /\.pdf$/i.test(fileName);
}

/** First `maxLines` lines of a tabular/text file, capped at `maxChars`. */
export function headLines(text: string, maxLines = 60, maxChars = 12_000): string {
  return text.split('\n').slice(0, maxLines).join('\n').slice(0, maxChars);
}
