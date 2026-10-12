import React from 'react';
import type { DatasetPreview } from '@/lib/datasets/preview';

interface Labels {
  chartTitle: string;
  chartNote: string;
  tableTitle: string;
  rowsNote: string;
}

const W = 640;
const H = 220;
const PAD = { l: 44, r: 12, t: 12, b: 26 };

const monthIndex = (ym: string) => Number(ym.slice(0, 4)) * 12 + Number(ym.slice(5, 7)) - 1;

/** Monthly-mean line chart (plain SVG, breaks the line where months are missing) and the first rows. */
export function DatasetPreviewView({ preview, labels, hi }: { preview: DatasetPreview; labels: Labels; hi: boolean }) {
  const s = preview.series;
  let chart: React.ReactNode = null;
  if (s && s.points.length >= 3) {
    const xs = s.points.map(([m]) => monthIndex(m));
    const ys = s.points.map(([, v]) => v);
    const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
    const [yMin, yMax] = [Math.min(...ys), Math.max(...ys)];
    const ySpan = yMax - yMin || 1;
    const px = (x: number) => PAD.l + ((x - x0) / (x1 - x0 || 1)) * (W - PAD.l - PAD.r);
    const py = (y: number) => PAD.t + (1 - (y - yMin) / ySpan) * (H - PAD.t - PAD.b);
    const d = s.points
      .map(([m, v], i) => `${i && xs[i] - xs[i - 1] <= 2 ? 'L' : 'M'}${px(monthIndex(m)).toFixed(1)} ${py(v).toFixed(1)}`)
      .join(' ');
    const firstYear = Math.floor(x0 / 12);
    const lastYear = Math.floor(x1 / 12);
    const step = Math.max(1, Math.ceil((lastYear - firstYear) / 6));
    const years: number[] = [];
    for (let y = firstYear; y <= lastYear; y += step) years.push(y);
    const fmt = (v: number) => new Intl.NumberFormat(hi ? 'hi-IN' : 'en-IN', { maximumFractionDigits: 1 }).format(v);
    const label = `${labels.chartTitle}: ${s.column}${s.unit ? ` (${s.unit})` : ''}, ${s.points[0][0]} – ${s.points[s.points.length - 1][0]}`;

    chart = (
      <figure className="space-y-2">
        <figcaption className="text-sm font-semibold text-[var(--snow)]">
          {labels.chartTitle}: <span className="font-mono">{s.column}</span>
          {s.unit ? <span className="text-[var(--mist)] font-normal"> ({s.unit})</span> : null}
        </figcaption>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="w-full h-auto rounded-xl border border-[var(--line)] bg-[var(--ink)]">
          {[yMin, (yMin + yMax) / 2, yMax].map((v) => (
            <g key={v}>
              <line x1={PAD.l} x2={W - PAD.r} y1={py(v)} y2={py(v)} stroke="currentColor" className="text-[var(--line)]" strokeDasharray="3 4" />
              <text x={PAD.l - 6} y={py(v) + 4} textAnchor="end" fontSize="11" fill="var(--mist)">{fmt(v)}</text>
            </g>
          ))}
          {years.map((y) => (
            <text key={y} x={px(Math.max(y * 12, x0))} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--mist)">{y}</text>
          ))}
          <path d={d} fill="none" stroke="var(--glacier)" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
        <p className="text-xs text-[var(--mist)]">{labels.chartNote}</p>
      </figure>
    );
  }

  return (
    <div className="space-y-6">
      {chart}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-[var(--snow)]">{labels.tableTitle}</h3>
        <div className="overflow-x-auto rounded-xl border border-[var(--line)]">
          <table className="w-full text-xs font-mono tabular">
            <thead className="bg-[var(--ink)] text-[var(--mist)]">
              <tr>{preview.columns.map((c) => <th key={c} scope="col" className="px-3 py-2 text-left font-semibold whitespace-nowrap">{c}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {preview.rows.map((r, i) => (
                <tr key={i}>{r.map((v, j) => <td key={j} className="px-3 py-1.5 whitespace-nowrap text-[var(--snow)]/90">{v}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-[var(--mist)]">{labels.rowsNote}</p>
      </div>
    </div>
  );
}
