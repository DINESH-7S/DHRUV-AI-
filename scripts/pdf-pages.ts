/**
 * Adds page numbers to the search chunks of PDFs that were catalogued before chunks carried them,
 * so Ask Dhruv citations open the exact page. Each chunk is located in the PDF's per-page text
 * and prefixed "[p. N] "; embeddings are left as they are (the prefix barely changes meaning).
 *   npm run pdf-pages            (all text PDFs)
 *   npm run pdf-pages -- --dry   (report only)
 * Scanned PDFs (read visually) have section digests, not page text, and are skipped.
 */
import { createClient } from '@supabase/supabase-js';
import { extractPdfText } from '../lib/ai/extract';
import { pageMarker } from '../lib/ai/chunk';
import { parsePage } from '../lib/utils';

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});
const dry = process.argv.includes('--dry');
const compact = (s: string) => s.replace(/\s+/g, '');

async function main() {
  const { data: assets, error } = await admin
    .from('assets')
    .select('id, title, file_path, mime_type, ai_metadata')
    .eq('mime_type', 'application/pdf');
  if (error) throw error;

  for (const asset of assets ?? []) {
    const label = `${asset.id.slice(0, 8)} ${asset.title.slice(0, 60)}`;
    if (asset.ai_metadata?.read_visually) {
      console.log(`– ${label}: scanned, skipped`);
      continue;
    }
    const { data: chunks } = await admin
      .from('asset_chunks')
      .select('id, chunk_index, content')
      .eq('asset_id', asset.id)
      .order('chunk_index');
    const todo = (chunks ?? []).filter(
      (c) => parsePage(c.content) === null && !/^(Summary|Key findings) of "/.test(c.content),
    );
    if (!todo.length || !asset.file_path) {
      console.log(`– ${label}: nothing to do`);
      continue;
    }

    const { data: file, error: dlError } = await admin.storage.from('archive').download(asset.file_path);
    if (dlError || !file) {
      console.log(`✗ ${label}: download failed (${dlError?.message})`);
      continue;
    }
    const { pageTexts } = await extractPdfText(new Uint8Array(await file.arrayBuffer()));

    // Whitespace differs between extraction runs, so match on text with whitespace removed.
    const starts: number[] = [];
    let all = '';
    for (const p of pageTexts) {
      starts.push(all.length);
      all += compact(p);
    }
    const pageAt = (i: number) => starts.filter((s) => s <= i).length;

    let found = 0;
    let from = 0;
    for (const c of todo) {
      const head = compact(c.content);
      let at = -1;
      for (const len of [120, 60, 30]) {
        at = all.indexOf(head.slice(0, len), from);
        if (at < 0) at = all.indexOf(head.slice(0, len));
        if (at >= 0) break;
      }
      if (at < 0) continue;
      from = at;
      found++;
      if (!dry) {
        const { error: upError } = await admin
          .from('asset_chunks')
          .update({ content: pageMarker(pageAt(at)) + c.content })
          .eq('id', c.id);
        if (upError) throw upError;
      }
    }
    console.log(`${found === todo.length ? '✓' : '~'} ${label}: ${found}/${todo.length} chunks paged (${pageTexts.length} pages)`);
  }
  if (dry) console.log('\n(Dry run: nothing written.)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
