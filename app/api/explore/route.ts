import { NextResponse } from 'next/server';
import { fetchAssets, fetchExpeditions, fetchStations } from '@/lib/db/supabase';
import { isSourced } from '@/lib/expeditions';

/**
 * Public archive search for the Explore page. Running the query here keeps the Supabase client
 * and the mock data out of the browser bundle (about 120 KB of JavaScript on a phone).
 *   GET /api/explore?search=&type=&region=&station_id=&expedition_id=
 *   GET /api/explore?facets=1   → stations and sourced expeditions for the filter menus
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  try {
    if (url.searchParams.get('facets')) {
      const [stations, expeditions] = await Promise.all([fetchStations(), fetchExpeditions()]);
      return NextResponse.json({ stations, expeditions: expeditions.filter(isSourced) });
    }
    const pick = (k: string) => {
      const v = url.searchParams.get(k);
      return v && v !== 'all' ? v : undefined;
    };
    const assets = await fetchAssets({
      search: pick('search'),
      type: pick('type'),
      region: pick('region'),
      station_id: pick('station_id'),
      expedition_id: pick('expedition_id'),
    });
    // Only what the result cards show: full rows carry transcripts, chapters and previews.
    const cards = assets.map((a) => ({
      id: a.id,
      type: a.type,
      title: a.title,
      title_hi: a.title_hi,
      description: a.description?.slice(0, 400),
      ai_summary: a.ai_summary?.slice(0, 400),
      ai_summary_hi: a.ai_summary_hi?.slice(0, 400),
      alt_text: a.alt_text,
      authors: a.authors,
      discipline: a.discipline,
      download_count: a.download_count,
      view_count: a.view_count,
      region: a.region,
      thumbnail: a.thumbnail,
      year: a.year,
      ai_metadata: a.ai_metadata?.mock ? { mock: true } : undefined,
    }));
    return NextResponse.json({ assets: cards });
  } catch (err) {
    console.error('[api/explore]', err);
    return NextResponse.json({ error: 'Search failed.' }, { status: 500 });
  }
}
