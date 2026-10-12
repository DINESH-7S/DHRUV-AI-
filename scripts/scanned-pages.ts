/**
 * Page numbers for scanned PDFs catalogued before digests carried them: the model reads the PDF
 * once more and says where each digest section starts. Sections are prefixed "[p. N] " so Ask
 * Dhruv citations open the right page. Pages must run in reading order or the item is skipped.
 *   npm run scanned-pages            (all scanned PDFs)
 *   npm run scanned-pages -- --dry   (report only)
 * Pages found this way are AI-located: spot-check them (content/CHECKLIST.md).
 */
import { createClient } from '@supabase/supabase-js';
import * as z from 'zod/v4';
import { pageMarker } from '../lib/ai/chunk';
import { generateStructured } from '../lib/ai/llm';
import { parsePage } from '../lib/utils';

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});
const dry = process.argv.includes('--dry');

const PagesSchema = z.object({
  sections: z
    .array(z.object({ n: z.number().int().describe('Section number from the list.'), page: z.number().int().describe('PDF page (1 = first page of the file) where the section starts.') }))
    .describe('One entry per listed section.'),
});

async function main() {
  const { data: assets, error } = await admin
    .from('assets')
    .select('id, title, file_path, ai_metadata')
    .eq('mime_type', 'application/pdf');
  if (error) throw error;

  for (const asset of (assets ?? []).filter((a) => a.ai_metadata?.read_visually)) {
    const label = `${asset.id.slice(0, 8)} ${asset.title.slice(0, 60)}`;
    const pages = Number(asset.ai_metadata?.pages ?? 0);
    const { data: chunks } = await admin
      .from('asset_chunks')
      .select('id, chunk_index, content')
      .eq('asset_id', asset.id)
      .order('chunk_index');
    const prefix = `${asset.title}: `;
    const sections = (chunks ?? []).filter((c) => c.content.startsWith(prefix) && parsePage(c.content) === null);
    if (!sections.length || !asset.file_path || !pages) {
      console.log(`– ${label}: nothing to do`);
      continue;
    }

    const { data: file, error: dlError } = await admin.storage.from('archive').download(asset.file_path);
    if (dlError || !file) {
      console.log(`✗ ${label}: download failed (${dlError?.message})`);
      continue;
    }
    const list = sections
      .map((c, i) => `${i + 1}. ${c.content.slice(prefix.length).split('\n')[0]} | ${c.content.split('\n').slice(1).join(' ').slice(0, 160)}`)
      .join('\n');
    const started = Date.now();
    const result = await generateStructured({
      patient: true,
      tier: 'smart',
      system: 'You locate sections in a scanned PDF. Answer with PDF page numbers, counting the first page of the file as 1, not the page numbers printed on the pages.',
      schema: PagesSchema,
      maxTokens: 4000,
      timeoutMs: 300_000,
      content: [
        { type: 'pdf', data: Buffer.from(await file.arrayBuffer()).toString('base64') },
        { type: 'text', text: `This PDF has ${pages} pages. For each section below (heading | opening of a summary of it), give the PDF page where it starts.\n\n${list}` },
      ],
    });
    const byN = new Map(result.data.sections.map((s) => [s.n, s.page]));
    const found = sections.map((_, i) => byN.get(i + 1) ?? 0);
    const valid = found.every((p) => p >= 1 && p <= pages);
    const ordered = found.every((p, i) => i === 0 || p >= found[i - 1]);
    console.log(`${valid && ordered ? '✓' : '✗'} ${label}: pages ${found.join(', ')} (${((Date.now() - started) / 1000).toFixed(0)} s)`);
    if (!valid || !ordered) {
      console.log('    skipped: pages missing, out of range or out of order');
      continue;
    }
    if (dry) continue;
    for (const [i, c] of sections.entries()) {
      const { error: upError } = await admin.from('asset_chunks').update({ content: pageMarker(found[i]) + c.content }).eq('id', c.id);
      if (upError) throw upError;
    }
  }
  if (dry) console.log('\n(Dry run: nothing written.)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
