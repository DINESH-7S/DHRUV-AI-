// ~4 characters per token for English prose: 3200 chars ≈ 800 tokens, 400 chars ≈ 100 tokens (SPEC).
const CHUNK_CHARS = 3200;
const OVERLAP_CHARS = 400;

/**
 * Splits text into overlapping chunks, preferring paragraph, then sentence, then word
 * boundaries so chunks read cleanly as RAG citations.
 */
export function chunkText(text: string, size = CHUNK_CHARS, overlap = OVERLAP_CHARS): string[] {
  return chunkWithOffsets(text.trim(), size, overlap).map((c) => c.text);
}

/** Page marker at the start of a PDF chunk: "[p. 12] ...". */
export const pageMarker = (page: number) => `[p. ${page}] `;

/**
 * Chunks for a PDF with a text layer. Each chunk starts with the page it begins on, so Ask Dhruv
 * can cite the exact page. `pages` is the extracted text of each page, in order.
 */
export function chunkPages(pages: string[], size = CHUNK_CHARS, overlap = OVERLAP_CHARS): string[] {
  const { merged, pageAt } = mergePages(pages);
  return chunkWithOffsets(merged, size, overlap).map((c) => pageMarker(pageAt(c.start)) + c.text);
}

/** Joins page texts with blank lines and maps a character offset back to its page number. */
export function mergePages(pages: string[]): { merged: string; pageAt: (offset: number) => number } {
  const starts: { offset: number; page: number }[] = [];
  let merged = '';
  pages.forEach((raw, i) => {
    const text = raw.trim();
    if (!text) return;
    if (merged) merged += '\n\n';
    starts.push({ offset: merged.length, page: i + 1 });
    merged += text;
  });
  const pageAt = (offset: number) => {
    let page = starts[0]?.page ?? 1;
    for (const s of starts) {
      if (s.offset > offset) break;
      page = s.page;
    }
    return page;
  };
  return { merged, pageAt };
}

function chunkWithOffsets(clean: string, size: number, overlap: number): { text: string; start: number }[] {
  if (!clean) return [];

  const chunks: { text: string; start: number }[] = [];
  let start = 0;

  while (start < clean.length) {
    let end = Math.min(start + size, clean.length);

    if (end < clean.length) {
      const minEnd = start + size * 0.5;
      const paragraph = clean.lastIndexOf('\n\n', end);
      const sentence = clean.lastIndexOf('. ', end);
      const word = clean.lastIndexOf(' ', end);
      if (paragraph > minEnd) end = paragraph;
      else if (sentence > minEnd) end = sentence + 1;
      else if (word > start) end = word;
    }

    const raw = clean.slice(start, end);
    const piece = raw.trim();
    if (piece) chunks.push({ text: piece, start: start + (raw.length - raw.trimStart().length) });
    if (end >= clean.length) break;

    // Step back for overlap, then forward to the next word boundary.
    let next = Math.max(end - overlap, start + 1);
    const space = clean.indexOf(' ', next);
    if (space !== -1 && space < end) next = space + 1;
    start = next;
  }

  return chunks;
}
