import React from 'react';
import type { ExpeditionStop } from '@/lib/types/database';

interface RouteMapProps {
  stops: ExpeditionStop[];
  hi: boolean;
  /** Accessible description, e.g. "Schematic route: Goa → Cape Town → Bharati". */
  label: string;
  className?: string;
}

const MIN_WIDTH = 70; // degrees of longitude
const ASPECT = 16 / 9;
const PAD = 12; // degrees

/**
 * A schematic route on a flat (equirectangular) world map: the stops joined by straight lines.
 * Plain SVG over a 71 KB image, so it costs no JavaScript. Never presented as a GPS track.
 */
export function RouteMap({ stops, hi, label, className = '' }: RouteMapProps) {
  if (stops.length === 0) return null;
  const pts = stops.map((s) => ({ x: s.lng + 180, y: 90 - s.lat, name: (hi && s.label_hi) || s.label }));

  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  let w = Math.max(Math.max(...xs) - Math.min(...xs) + PAD * 2, MIN_WIDTH);
  let h = Math.max(Math.max(...ys) - Math.min(...ys) + PAD * 2, w / ASPECT);
  w = Math.max(w, h * ASPECT);
  w = Math.min(w, 360);
  h = Math.min(h, 200);
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
  const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  const x0 = Math.min(Math.max(cx - w / 2, 0), 360 - w);
  // Vertically the view may run past a pole (the dark background shows there) so pole labels fit.
  const y0 = Math.min(Math.max(cy - h / 2, -10), 190 - h);

  const fs = w / 34;
  const r = w / 130;
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');

  return (
    <svg
      viewBox={`${x0.toFixed(2)} ${y0.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}`}
      role="img"
      aria-label={label}
      className={`w-full h-auto rounded-2xl border border-[var(--line)] bg-[#050d17] ${className}`}
    >
      <image href="/maps/world-night-2048.webp" x="0" y="0" width="360" height="180" preserveAspectRatio="none" />
      {pts.length > 1 && (
        <path d={path} fill="none" stroke="#5bbfe6" strokeWidth={w / 260} strokeDasharray={`${w / 80} ${w / 140}`} strokeLinecap="round" strokeLinejoin="round" />
      )}
      {pts.map((p, i) => {
        const right = p.x - x0 < w * 0.62;
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={r * 2.2} fill="#5bbfe6" opacity="0.25" />
            <circle cx={p.x} cy={p.y} r={r} fill={i === pts.length - 1 ? '#f4f7fb' : '#5bbfe6'} />
            <text
              x={p.x + (right ? r * 2.6 : -r * 2.6)}
              y={p.y + fs * 0.35}
              fontSize={fs}
              textAnchor={right ? 'start' : 'end'}
              fill="#f4f7fb"
              stroke="#050d17"
              strokeWidth={fs / 5}
              paintOrder="stroke"
              style={{ fontFamily: 'inherit' }}
            >
              {p.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
