/**
 * Writes the verified expedition facts in content/expeditions.json into the expeditions table
 * (dates, leader, EN/HI summaries, schematic route, sources, milestones) and links the listed
 * archive items to their expedition. Idempotent; safe to re-run after editing the JSON.
 *
 * Run:  npm run import-expeditions
 */
import { readFileSync } from 'fs';
import { supabaseAdmin } from '../lib/db/admin';
import type { ExpeditionDossier, ExpeditionGeo, ExpeditionSource, ExpeditionStop, ExpeditionMilestone } from '../lib/types/database';

interface PackExpedition {
  code: string;
  name: string;
  name_hi: string;
  region: string;
  start_date: string;
  date_precision?: ExpeditionDossier['date_precision'];
  end_date: string | null;
  leader: string | null;
  station: string | null;
  summary: string;
  summary_hi: string;
  sources: ExpeditionSource[];
  milestones: ExpeditionMilestone[];
  route: ExpeditionStop[];
  /** Asset id prefixes (first 8 characters) to link to this expedition. */
  assets: string[];
}

/** The seed's placeholder for an unverified leader; the site never shows it as a name. */
const UNVERIFIED_LEADER = 'See NCPOR records';

function toGeo(e: PackExpedition): ExpeditionGeo {
  const coords = e.route.map((s) => [s.lng, s.lat]);
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: coords.length > 1 ? { type: 'LineString', coordinates: coords } : { type: 'Point', coordinates: coords[0] },
        properties: { schematic: true },
      },
    ],
    dhruv: {
      date_precision: e.date_precision ?? 'day',
      station: e.station,
      stops: e.route,
      sources: e.sources,
      milestones: e.milestones,
    },
  };
}

async function main() {
  const db = supabaseAdmin();
  const pack = JSON.parse(readFileSync('content/expeditions.json', 'utf8')) as { expeditions: PackExpedition[] };
  const { data: assets, error: assetErr } = await db.from('assets').select('id, expedition_id');
  if (assetErr) throw new Error(assetErr.message);

  for (const e of pack.expeditions) {
    const { data: row, error } = await db
      .from('expeditions')
      .upsert(
        {
          code: e.code,
          name: e.name,
          name_hi: e.name_hi,
          region: e.region,
          start_date: e.start_date,
          end_date: e.end_date,
          leader: e.leader ?? UNVERIFIED_LEADER,
          summary: e.summary,
          summary_hi: e.summary_hi,
          route_geojson: toGeo(e),
        },
        { onConflict: 'code' },
      )
      .select('id')
      .single();
    if (error || !row) throw new Error(`${e.code}: ${error?.message}`);

    const ids = e.assets.map((prefix) => {
      const match = (assets ?? []).filter((a) => (a.id as string).startsWith(prefix));
      if (match.length !== 1) throw new Error(`${e.code}: asset prefix ${prefix} matched ${match.length} assets`);
      return match[0].id as string;
    });
    if (ids.length) {
      const { error: linkErr } = await db.from('assets').update({ expedition_id: row.id }).in('id', ids);
      if (linkErr) throw new Error(`${e.code} links: ${linkErr.message}`);
    }
    console.log(`${e.code.padEnd(22)} ${e.sources.length} source(s), ${e.milestones.length} milestone(s), ${ids.length} linked item(s)`);
  }
  // The site's 60 s query cache picks the changes up on its own.
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
