/**
 * Re-embeds every archive chunk with the CURRENT embedding model (see embeddingMode() in lib/ai/embed.ts).
 * Run after switching EMBEDDING_PROVIDER / AI_PROVIDER, because vectors from different models
 * cannot be compared (semantic search and Ask Dhruv would return nonsense).
 *   npm run reembed            re-embed everything
 *   npm run reembed -- --dry   show what would happen
 */
import { createClient } from '@supabase/supabase-js';
import { embeddingMode, embedTexts, EMBEDDING_DIMS } from '../lib/ai/embed';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const dry = process.argv.includes('--dry');
const PAGE = 64;

async function main() {
  const mode = embeddingMode();
  const { count } = await db.from('asset_chunks').select('id', { count: 'exact', head: true });
  console.log(`Embedding model: ${mode}. Chunks to re-embed: ${count ?? 0}.${dry ? ' (dry run)' : ''}`);
  if (dry || !count) return;
  if (mode === 'mock') console.warn('Warning: mock embeddings are keyword hashes, not semantic vectors.');

  const started = Date.now();
  let done = 0;
  for (let from = 0; from < count; from += PAGE) {
    const { data: rows, error } = await db.from('asset_chunks').select('id, content').order('id').range(from, from + PAGE - 1);
    if (error) throw error;
    const vectors = await embedTexts(rows.map(r => r.content), 'document');
    for (let i = 0; i < rows.length; i++) {
      if (vectors[i].length !== EMBEDDING_DIMS) throw new Error(`Model returned ${vectors[i].length} dimensions; the schema needs ${EMBEDDING_DIMS}.`);
      const { error: upErr } = await db.from('asset_chunks').update({ embedding: vectors[i] }).eq('id', rows[i].id);
      if (upErr) throw upErr;
    }
    done += rows.length;
    console.log(`  ${done}/${count} (${Math.round((Date.now() - started) / 1000)} s)`);
  }
  console.log(`Done: ${done} chunks re-embedded with ${mode} in ${Math.round((Date.now() - started) / 1000)} s.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
