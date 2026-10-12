/**
 * A small, pre-computed preview of a CSV dataset, stored in assets.ai_metadata.preview so the
 * dataset page can show a table and a chart without downloading the file (some are 3-4 MB).
 * Pure functions: used by ingestion for new uploads and by scripts/dataset-previews.ts for old ones.
 */

export interface DatasetPreview {
  columns: string[];
  /** First rows, as text, limited to the preview columns. */
  rows: string[][];
  totalRows: number;
  /** Monthly means of one measured variable over time, if the file has a time axis. */
  series?: {
    column: string;
    unit?: string;
    /** [YYYY-MM, mean] */
    points: [string, number][];
  };
}

const MAX_COLUMNS = 8;
const MAX_ROWS = 6;

/** Minimal CSV line parser: commas, double-quoted fields, doubled quotes. */
function parseLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      out.push(cur.trim());
      cur = '';
    } else cur += c;
  }
  out.push(cur.trim());
  return out;
}

// Which measured column to chart, in order of preference.
const PREFERRED = [/^extent$/i, /^temperature$/i, /air_?temp.*avg|avg.*air_?temp/i, /air_?temp_?max/i, /temp/i, /pressure/i, /wind/i];
/** Common "no data" markers in polar datasets; never averaged. */
const MISSING = new Set([-999, -999.9, -9999, -99.9, 999.9, 9999, -99999]);
const TIME_COLUMN = /^(obstime|time_?stamp|date_?time|datetime|date|time|timestamp)$/i;

/** "2015-10-18 18:30:00+00" or "1985-02-26" → "2015-10" (null if not a date). */
function monthOf(value: string): string | null {
  const m = value.match(/^(\d{4})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}` : null;
}

export function buildPreview(csv: string, units: Record<string, string> = {}): DatasetPreview | null {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return null;
  const header = parseLine(lines[0]);
  const body = lines.slice(1).map(parseLine).filter((r) => r.length >= Math.min(header.length, 2));

  // Rows whose first cell is not data (e.g. NSIDC's units line "YYYY, MM, DD, 10^6 sq km") are skipped for the chart.
  const yearIdx = header.findIndex((h) => /^year$/i.test(h));
  const monthIdx = header.findIndex((h) => /^month$/i.test(h));
  const timeIdx = header.findIndex((h) => TIME_COLUMN.test(h));
  const dataRows = yearIdx >= 0 ? body.filter((r) => /^\d{4}$/.test(r[yearIdx])) : body;

  const numeric = header
    .map((h, i) => ({ h, i }))
    .filter(({ h, i }) => i !== yearIdx && i !== monthIdx && i !== timeIdx && !/^(id|day|missing)$/i.test(h) && !/date_time$/i.test(h))
    .filter(({ i }) => {
      const sample = dataRows.slice(0, 50).map((r) => r[i]);
      return sample.filter((v) => v !== '' && Number.isFinite(Number(v))).length >= sample.length * 0.8 && sample.length > 0;
    });
  const pick = PREFERRED.map((re) => numeric.find(({ h }) => re.test(h))).find(Boolean) ?? numeric[0];

  let series: DatasetPreview['series'];
  const monthKey = (r: string[]): string | null =>
    yearIdx >= 0 && monthIdx >= 0 ? `${r[yearIdx]}-${String(r[monthIdx]).padStart(2, '0')}` : timeIdx >= 0 ? monthOf(r[timeIdx]) : null;
  if (pick && (timeIdx >= 0 || (yearIdx >= 0 && monthIdx >= 0))) {
    const sums = new Map<string, { sum: number; n: number }>();
    for (const r of dataRows) {
      const key = monthKey(r);
      const v = Number(r[pick.i]);
      if (!key || r[pick.i] === '' || !Number.isFinite(v) || MISSING.has(v)) continue;
      const s = sums.get(key) ?? { sum: 0, n: 0 };
      s.sum += v;
      s.n++;
      sums.set(key, s);
    }
    const points = [...sums.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, { sum, n }]) => [k, Math.round((sum / n) * 100) / 100] as [string, number]);
    if (points.length >= 3) series = { column: pick.h, unit: units[pick.h], points };
  }

  const cols = header.slice(0, MAX_COLUMNS);
  return {
    columns: cols,
    rows: body.slice(0, MAX_ROWS).map((r) => r.slice(0, cols.length)),
    totalRows: dataRows.length,
    series,
  };
}
