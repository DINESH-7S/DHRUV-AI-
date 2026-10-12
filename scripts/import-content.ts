/**
 * Imports the demo content in seed-content/manifest.json through the REAL pipeline:
 * upload to storage → AI ingestion (summaries, Hindi, tags, embeddings) → publish.
 *
 * Idempotent: items already imported (same storage path) are skipped, and failed ones are
 * retried on the next run.  Run:  npm run import-content   (optionally: -- --only=photo)
 */
import { readFileSync } from 'fs';
import path from 'path';
import { supabaseAdmin } from '../lib/db/admin';
import { ARCHIVE_BUCKET } from '../lib/db/buckets';
import { runIngestion } from '../lib/ai/ingest';

interface ManifestItem {
  file: string;
  type: 'report' | 'publication' | 'dataset' | 'photo' | 'video';
  title: string;
  title_hi: string | null;
  region: 'antarctic' | 'arctic' | 'himalaya' | 'southern_ocean';
  year: number;
  authors: string[];
  license: string;
  source_url: string;
  description: string;
  station?: string | null;
  /** Publications: the DOI, without the https://doi.org/ prefix. */
  doi?: string | null;
}

const ROOT = path.resolve('seed-content');
const MIME: Record<string, string> = { '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.csv': 'text/csv' };
// Quick items first so the site fills up early; the big annual reports go last.
const ORDER: ManifestItem['type'][] = ['photo', 'dataset', 'publication', 'report'];

const only = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1];
const db = supabaseAdmin();

async function main() {
  const manifest = (JSON.parse(readFileSync(path.join(ROOT, 'manifest.json'), 'utf8')) as ManifestItem[])
    .filter((i) => !only || i.type === only)
    .sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type));

  const { data: stations } = await db.from('stations').select('id, name');
  const stationId = new Map((stations ?? []).map((s) => [s.name as string, s.id as string]));
  const { data: admin } = await db.from('profiles').select('id').eq('role', 'super_admin').limit(1).maybeSingle();

  let imported = 0, skipped = 0, failed = 0;
  for (const [n, item] of manifest.entries()) {
    const label = `[${n + 1}/${manifest.length}] ${item.type.padEnd(11)} ${item.title.slice(0, 60)}`;
    const storagePath = `seed/${item.file}`;
    const started = Date.now();

    // limit(1) rather than maybeSingle(): a duplicate row must not make us create yet another one.
    const { data: matches } = await db
      .from('assets')
      .select('id, status')
      .eq('file_path', storagePath)
      .order('status', { ascending: false })
      .limit(1);
    const existing = matches?.[0];
    if (existing?.status === 'published') {
      console.log(`${label}  — already imported`);
      skipped++;
      continue;
    }

    try {
      const bytes = readFileSync(path.join(ROOT, item.file));
      let assetId = existing?.id as string | undefined;

      if (!assetId) {
        const up = await db.storage.from(ARCHIVE_BUCKET).upload(storagePath, bytes, {
          contentType: MIME[path.extname(item.file).toLowerCase()] ?? 'application/octet-stream',
          upsert: true,
        });
        if (up.error) throw new Error(`storage: ${up.error.message}`);

        const credit = `Source: ${item.source_url} · Licence: ${item.license}`;
        const { data: asset, error } = await db
          .from('assets')
          .insert({
            type: item.type,
            title: item.title,
            title_hi: item.title_hi,
            description: `${item.description}\n\n${credit}`,
            file_path: storagePath,
            mime_type: MIME[path.extname(item.file).toLowerCase()] ?? null,
            file_size: bytes.byteLength,
            station_id: item.station ? stationId.get(item.station) ?? null : null,
            region: item.region,
            year: item.year,
            discipline: [],
            authors: [...new Set(item.authors.map((a) => a.replace(/(Unknown author)+/i, 'Unknown author')))],
            doi: item.doi ?? null,
            license: item.license.slice(0, 100),
            access_level: 'public',
            status: 'draft',
            created_by: admin?.id ?? null,
          })
          .select('id')
          .single();
        if (error) throw new Error(`asset: ${error.message}`);
        assetId = asset.id;
      }

      const { data: job, error: jobError } = await db
        .from('ai_jobs')
        .insert({ asset_id: assetId, job_type: 'ingest', status: 'pending' })
        .select('id')
        .single();
      if (jobError) throw new Error(`job: ${jobError.message}`);
      await db.from('assets').update({ status: 'processing' }).eq('id', assetId);

      await runIngestion(job.id, assetId!);

      const { data: result } = await db.from('ai_jobs').select('status, error').eq('id', job.id).single();
      if (result?.status !== 'completed') throw new Error(result?.error ?? 'ingestion did not complete');

      // Demo content is curated and credited, so it is published directly.
      await db.from('assets').update({ status: 'published', published_at: new Date().toISOString() }).eq('id', assetId);
      const { count } = await db.from('asset_chunks').select('id', { count: 'exact', head: true }).eq('asset_id', assetId);
      console.log(`${label}  ✓ ${Math.round((Date.now() - started) / 1000)}s, ${count} chunks`);
      imported++;
    } catch (err) {
      console.log(`${label}  ✗ ${err instanceof Error ? err.message.slice(0, 160) : err}`);
      failed++;
    }
  }

  console.log(`\nImported ${imported}, already there ${skipped}, failed ${failed}.${failed ? ' Re-run to retry the failures.' : ''}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
