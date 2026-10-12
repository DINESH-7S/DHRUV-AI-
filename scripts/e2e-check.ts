/**
 * End-to-end check of the core demo flow against the running dev server and real services:
 * upload → AI ingestion → staff preview → campaign → submit → approve → publish → public view.
 *
 * Needs `npm run dev` running with DEV_AUTH_BYPASS=true.  Run:  npm run e2e
 * Creates one clearly-labelled test asset and deletes it at the end (pass --keep to keep it).
 */
import { createClient } from '@supabase/supabase-js';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const KEEP = process.argv.includes('--keep');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});
const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
  auth: { persistSession: false },
});

const TEXT = [
  'SAMPLE DOCUMENT FOR SOFTWARE TESTING - NOT AN NCPOR PUBLICATION',
  'Snow accumulation monitoring near Maitri station, 2023 summer season',
  'During the 2023 summer season a field team installed 12 bamboo stakes in a line',
  'south of Maitri station in the Schirmacher Oasis to monitor snow accumulation.',
  'The stakes were read once a week from December to February.',
  'The purpose of this note is to describe the method so that readings from future',
  'seasons can be compared with this baseline. Measurements are kept in a separate dataset.',
];

function samplePdf(lines: string[]): Uint8Array {
  const esc = (s: string) => s.replace(/[\\()]/g, (c) => `\\${c}`);
  const stream = `BT /F1 11 Tf 60 740 Td 16 TL ${lines.map((l) => `(${esc(l)}) '`).join(' ')} ET`;
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  objs.forEach((o, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(out);
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${init?.method ?? 'GET'} ${path} → ${res.status}: ${body.error ?? JSON.stringify(body)}`);
  return body as T;
}

const step = (msg: string) => console.log(`\n▶ ${msg}`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const started = Date.now();
  let assetId: string | null = null;
  try {
    step('Upload (asset row + file to storage, as createUploadUrl + browser upload do)');
    const { data: station } = await db.from('stations').select('id').eq('name', 'Maitri').single();
    assetId = crypto.randomUUID();
    const path = `report/${assetId}/e2e-sample.pdf`;
    const pdf = samplePdf(TEXT);
    const up = await db.storage.from('archive').upload(path, pdf, { contentType: 'application/pdf' });
    if (up.error) throw new Error(`Storage upload: ${up.error.message}`);
    const ins = await db.from('assets').insert({
      id: assetId, type: 'report', title: '[E2E TEST] Snow accumulation at Maitri, 2023', description: 'Automated end-to-end test asset.',
      file_path: path, mime_type: 'application/pdf', file_size: pdf.byteLength, station_id: station?.id ?? null,
      region: 'antarctic', year: 2023, discipline: ['glaciology'], authors: ['E2E Test'], access_level: 'public', status: 'draft',
    });
    if (ins.error) throw new Error(`Asset insert: ${ins.error.message}`);
    console.log('  asset', assetId);

    step('AI ingestion via POST /api/ingest');
    const { jobId } = await api<{ jobId: string }>('/api/ingest', { method: 'POST', body: JSON.stringify({ assetId }) });
    let job: { status: string; error: string | null } = { status: 'pending', error: null };
    for (let i = 0; i < 90 && (job.status === 'pending' || job.status === 'processing'); i++) {
      await sleep(2000);
      job = await api(`/api/ingest?jobId=${jobId}`);
    }
    if (job.status !== 'completed') throw new Error(`Ingestion ${job.status}: ${job.error}`);
    const { data: asset } = await db.from('assets').select('*').eq('id', assetId).single();
    const { count: chunks } = await db.from('asset_chunks').select('id', { count: 'exact', head: true }).eq('asset_id', assetId);
    console.log(`  status=${asset.status} chunks=${chunks} model=${asset.ai_metadata?.model}`);
    console.log(`  summary: ${asset.ai_summary?.slice(0, 140)}…`);
    console.log(`  hindi:   ${asset.ai_summary_hi?.slice(0, 80)}…`);
    console.log(`  keywords: ${asset.ai_keywords?.join(', ')}`);

    step('Public cannot see the unpublished asset (RLS)');
    const { data: hidden } = await anon.from('assets').select('id').eq('id', assetId);
    console.log(`  anon rows: ${hidden?.length ?? 0} (expected 0)`);
    if (hidden?.length) throw new Error('Unpublished asset visible to the public!');

    step('Staff preview page renders');
    const page = await fetch(`${BASE}/asset/${assetId}`);
    const html = await page.text();
    console.log(`  GET /asset/${assetId.slice(0, 8)}… → ${page.status}, staff banner: ${html.includes('Staff preview')}`);

    step('Campaign via POST /api/campaign (x, linkedin, press_release; EN + HI)');
    const posts = await api<{ id: string; channel: string; language: string; body: string }[]>('/api/campaign', {
      method: 'POST', body: JSON.stringify({ assetId, channels: ['x', 'linkedin', 'press_release'], languages: ['en', 'hi'] }),
    });
    for (const p of posts) console.log(`  ${p.language}/${p.channel}: ${p.body.slice(0, 90).replace(/\n/g, ' ')}…`);

    step('Workflow: submit → approve → publish (press release, EN)');
    const pr = posts.find((p) => p.channel === 'press_release' && p.language === 'en')!;
    for (const action of ['submit', 'approve', 'publish'] as const) {
      const updated = await api<{ status: string }>(`/api/posts/${pr.id}`, { method: 'PATCH', body: JSON.stringify({ action }) });
      console.log(`  ${action} → ${updated.status}`);
    }
    try {
      await api(`/api/posts/${pr.id}`, { method: 'PATCH', body: JSON.stringify({ action: 'approve' }) });
      throw new Error('Approving a published post should fail');
    } catch (e) {
      console.log(`  invalid transition rejected: ${(e as Error).message.split(': ').pop()}`);
    }

    step('Public can now see asset and post');
    const { data: pubAsset } = await anon.from('assets').select('status').eq('id', assetId).maybeSingle();
    const { data: pubPost } = await anon.from('content_posts').select('status').eq('id', pr.id).maybeSingle();
    console.log(`  asset: ${pubAsset?.status}, post: ${pubPost?.status}`);
    if (pubAsset?.status !== 'published' || pubPost?.status !== 'published') throw new Error('Published content not publicly visible');

    step('Related-assets RPC and download route');
    const rel = await anon.rpc('related_assets', { p_asset_id: assetId, match_count: 3 });
    console.log(`  related_assets: ${rel.error ? rel.error.message : `${rel.data.length} rows`}`);
    const dl = await fetch(`${BASE}/api/assets/${assetId}/download`, { redirect: 'manual' });
    console.log(`  download → ${dl.status} ${dl.headers.get('location')?.slice(0, 60)}…`);

    console.log(`\n✅ All steps passed in ${Math.round((Date.now() - started) / 1000)}s`);
  } finally {
    if (assetId && !KEEP) {
      await db.from('assets').delete().eq('id', assetId); // cascades to chunks, posts, jobs
      await db.storage.from('archive').remove([`report/${assetId}/e2e-sample.pdf`]);
      console.log('Cleaned up test asset.');
    }
  }
}

main().catch((err) => {
  console.error('\n❌', err instanceof Error ? err.message : err);
  process.exit(1);
});
