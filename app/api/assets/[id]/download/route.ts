import { NextResponse } from 'next/server';
import { getAssetForViewer, resolveViewer, signedFileUrl, trackAssetEvent } from '@/lib/db/assets';

export const runtime = 'nodejs';

/** GET → 302 to a 60-second signed URL for the original file, if this viewer may see the asset. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await resolveViewer();
  const asset = await getAssetForViewer(id, viewer);
  if (!asset) return NextResponse.json({ error: 'Asset not found.' }, { status: 404 });

  const url = await signedFileUrl(asset, { download: true, expiresIn: 60 });
  if (!url) return NextResponse.json({ error: 'This item has no downloadable file.' }, { status: 404 });

  await trackAssetEvent(asset.id, 'download');
  return NextResponse.redirect(url, 302);
}
