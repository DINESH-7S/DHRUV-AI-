import type { Expedition, ExpeditionDossier } from './types/database';
import { formatDay } from './utils';

/** The seed's placeholder when the leader was not verified; never shown as a name. */
export const UNVERIFIED_LEADER = 'See NCPOR records';

export function dossierOf(e: Expedition): ExpeditionDossier | null {
  const d = e.route_geojson?.dhruv;
  return d && Array.isArray(d.sources) ? d : null;
}

/** Only expeditions with at least one source appear on the public site (content/expeditions.json). */
export function isSourced(e: Expedition): boolean {
  return (dossierOf(e)?.sources.length ?? 0) > 0;
}

export function leaderOf(e: Expedition): string | null {
  return e.leader && e.leader !== UNVERIFIED_LEADER ? e.leader : null;
}

/** URL segment for an expedition: its code, which is unique and readable (/expeditions/ISEA-43). */
export function expeditionHref(e: Pick<Expedition, 'code'>): string {
  return `/expeditions/${encodeURIComponent(e.code)}`;
}

/** The start date as precisely as the source allows, e.g. "November 2010" or "2024–25 season". */
export function expeditionWhen(e: Expedition, hi: boolean): string {
  const precision = dossierOf(e)?.date_precision ?? 'day';
  const year = Number(e.start_date.slice(0, 4));
  const start =
    precision === 'month'
      ? formatDay(e.start_date, hi, { month: 'long', year: 'numeric' })
      : precision === 'season'
        ? hi
          ? `${year}–${String(year + 1).slice(2)} सत्र`
          : `${year}–${String(year + 1).slice(2)} season`
        : formatDay(e.start_date, hi);
  const prefixed =
    precision === 'first_record' ? (hi ? `पहली बार दर्ज: ${start}` : `First recorded ${start}`)
    : precision === 'reported' ? (hi ? `सूचना: ${start}` : `Reported ${start}`)
    : start;
  return e.end_date ? `${prefixed} – ${formatDay(e.end_date, hi)}` : prefixed;
}
