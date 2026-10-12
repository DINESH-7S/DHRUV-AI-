/**
 * Downloads the datasets listed in content/datasets.json into seed-content/datasets/, converts
 * NCPOR's HTML data tables to CSV, and adds each one to seed-content/manifest.json so that
 * `npm run import-content -- --only=dataset` imports it.
 *
 * Idempotent: files already on disk are not downloaded again.  Run:  npm run fetch-datasets
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

const ROOT = path.resolve('seed-content');
const MANIFEST = path.join(ROOT, 'manifest.json');
const pack = JSON.parse(readFileSync('content/datasets.json', 'utf8'));
const AUTHOR = 'National Centre for Polar and Ocean Research (NCPOR)';
// Headings in NCPOR's tables that are misspelt at the source.
const HEADING_FIXES = { Temerature: 'Temperature' };

function tableToCsv(html) {
  const header = [...html.matchAll(/<th>([\s\S]*?)<\/th>/g)].map((m) => HEADING_FIXES[m[1].trim()] ?? m[1].trim());
  // NCPOR's surface-data page lists the whole series twice; keep the first copy of each identical row.
  const seen = new Set();
  const rows = [];
  for (const tr of html.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    const cells = [...tr[1].matchAll(/<td>([\s\S]*?)<\/td>/g)].map((m) => m[1].trim());
    const key = cells.join('\u0000');
    if (cells.length === header.length && !seen.has(key)) {
      seen.add(key);
      rows.push(cells);
    }
  }
  if (!header.length || !rows.length) throw new Error('no table found in the page');
  const esc = (v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [header, ...rows].map((r) => r.map(esc).join(',')).join('\n') + '\n';
}

/** Row count and first/last value of the time column, for the checklist. */
function describe(csv) {
  const lines = csv.trim().split('\n');
  const timeCol = (line) => line.split(',')[line.startsWith('"') ? 1 : 0].replace(/"/g, '');
  return { rows: lines.length - 1, first: timeCol(lines[1]), last: timeCol(lines[lines.length - 1]) };
}

async function main() {
  mkdirSync(path.join(ROOT, 'datasets'), { recursive: true });
  const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : [];

  for (const d of pack.datasets) {
    const target = path.join(ROOT, d.file);
    if (!existsSync(target)) {
      process.stdout.write(`Downloading ${d.download.url} ... `);
      const res = await fetch(d.download.url, { headers: { 'User-Agent': 'Mozilla/5.0 (DHRUV SIH26063 prototype)' } });
      if (!res.ok) throw new Error(`${d.download.url}: HTTP ${res.status}`);
      const body = await res.text();
      writeFileSync(target, d.download.format === 'html-table' ? tableToCsv(body) : body);
      console.log('done');
    }
    const { rows, first, last } = describe(readFileSync(target, 'utf8'));
    console.log(`  ${d.file}: ${rows} rows, ${first} → ${last}`);

    const item = {
      file: d.file,
      type: 'dataset',
      title: d.title,
      title_hi: null,
      region: d.region,
      year: d.year,
      authors: [AUTHOR],
      license: pack.license,
      source_url: d.source_url,
      description: d.description,
      station: d.station,
    };
    const i = manifest.findIndex((m) => m.file === d.file);
    if (i >= 0) manifest[i] = item;
    else manifest.push(item);
  }

  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`\nManifest now lists ${manifest.length} items. Next: npm run import-content -- --only=dataset`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
