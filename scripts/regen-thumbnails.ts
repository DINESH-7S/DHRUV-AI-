/**
 * Regenerates public thumbnails for photo assets from their originals in storage:
 * a 1280px WebP (asset pages) and a 640px WebP next to it (grids; see smallThumbnail in lib/utils).
 * Run after changing the thumbnail sizes:  npx tsx --env-file=.env.local scripts/regen-thumbnails.ts
 * Add --small-only to create only the missing 640px versions (keeps the existing 1280px files and URLs).
 */
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const smallOnly = process.argv.includes('--small-only');

async function main() {
  const { data: photos, error } = await db.from('assets').select('id, title, file_path, access_level').eq('type', 'photo').not('file_path', 'is', null);
  if (error) throw error;
  for (const p of photos ?? []) {
    if (p.access_level !== 'public') continue; // restricted photos never get a public thumbnail
    const { data: file, error: dlError } = await db.storage.from('archive').download(p.file_path);
    if (dlError || !file) { console.log(`✗ ${p.title}: ${dlError?.message}`); continue; }
    const base = sharp(Buffer.from(await file.arrayBuffer()), { failOn: 'none' }).rotate();
    const small = await base.clone().resize(640, 640, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 72 }).toBuffer();
    const storage = db.storage.from('public-media');
    const upSmall = await storage.upload(`thumbnails/${p.id}-640.webp`, small, { contentType: 'image/webp', upsert: true });
    if (upSmall.error) { console.log(`✗ ${p.title}: ${upSmall.error.message}`); continue; }
    if (smallOnly) { console.log(`✓ ${p.title} (640px: ${Math.round(small.byteLength / 1024)} KB)`); continue; }

    const webp = await base.clone().resize(1280, 1280, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 76 }).toBuffer();
    const path = `thumbnails/${p.id}.webp`;
    const up = await storage.upload(path, webp, { contentType: 'image/webp', upsert: true });
    if (up.error) { console.log(`✗ ${p.title}: ${up.error.message}`); continue; }
    // Cache-bust so browsers and the CDN pick up the new file.
    const url = `${storage.getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
    await db.from('assets').update({ thumbnail: url }).eq('id', p.id);
    console.log(`✓ ${p.title} (${Math.round(webp.byteLength / 1024)} KB, 640px: ${Math.round(small.byteLength / 1024)} KB)`);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
