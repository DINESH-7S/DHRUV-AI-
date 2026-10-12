/**
 * Adds a table-and-chart preview (lib/datasets/preview.ts) to CSV datasets already in the archive.
 * New uploads get one during ingestion. Safe to re-run.
 *
 * Run:  npm run dataset-previews
 */
import { supabaseAdmin } from '../lib/db/admin';
import { ARCHIVE_BUCKET } from '../lib/db/buckets';
import { buildPreview } from '../lib/datasets/preview';
import type { AssetAIMetadata } from '../lib/types/database';

async function main() {
  const db = supabaseAdmin();
  const { data, error } = await db.from('assets').select('id, title, file_path, ai_metadata').eq('type', 'dataset');
  if (error) throw new Error(error.message);
  for (const a of data ?? []) {
    if (!a.file_path || !/\.csv$/i.test(a.file_path)) {
      console.log(`skip  ${a.title} (not a CSV)`);
      continue;
    }
    const { data: file, error: dlErr } = await db.storage.from(ARCHIVE_BUCKET).download(a.file_path);
    if (dlErr || !file) {
      console.log(`fail  ${a.title}: ${dlErr?.message}`);
      continue;
    }
    const meta = (a.ai_metadata ?? {}) as AssetAIMetadata;
    const units = Object.fromEntries((meta.variables ?? []).filter((v) => v.unit && v.unit !== 'unknown').map((v) => [v.name, v.unit]));
    const preview = buildPreview(await file.text(), units);
    if (!preview) {
      console.log(`skip  ${a.title} (empty)`);
      continue;
    }
    const { error: upErr } = await db.from('assets').update({ ai_metadata: { ...meta, preview } }).eq('id', a.id);
    if (upErr) throw new Error(upErr.message);
    console.log(`ok    ${a.title}: ${preview.totalRows} rows, chart ${preview.series ? `${preview.series.column} (${preview.series.points.length} months)` : 'none'}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
