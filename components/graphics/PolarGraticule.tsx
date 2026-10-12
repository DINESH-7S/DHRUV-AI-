import React from 'react';

export interface GraticuleStation {
  name: string;
  lat: number;
  lng: number;
}

/** India's Antarctic bases, from the stations table (decimal degrees). */
export const ANTARCTIC_STATIONS: GraticuleStation[] = [
  { name: 'Maitri', lat: -70.767, lng: 11.733 },
  { name: 'Bharati', lat: -69.408, lng: 76.193 },
  { name: 'Dakshin Gangotri', lat: -70.083, lng: 12 },
];

/** India's Arctic station, Himadri at Ny-Ålesund. */
export const ARCTIC_STATIONS: GraticuleStation[] = [{ name: 'Himadri', lat: 78.925, lng: 11.93 }];

interface Props {
  pole?: 'south' | 'north';
  stations?: GraticuleStation[];
  className?: string;
  /** Accessible description; decorative (hidden) when omitted. */
  label?: string;
}

const SIZE = 600;
const C = SIZE / 2;
const R = 280; // radius of the outermost circle (50°)
const OUTER_LAT = 50;
const d2r = (d: number) => (d * Math.PI) / 180;

/**
 * Polar stereographic graticule (DESIGN.md signature graphic): latitude rings every 10°,
 * meridians every 30°, stations plotted at their true positions. Greenwich at the top, east to
 * the right (the usual orientation of Antarctic maps). Rings draw in, the grid turns slowly, and
 * station markers pulse; all CSS, all disabled by prefers-reduced-motion.
 */
export function PolarGraticule({ pole = 'south', stations = pole === 'south' ? ANTARCTIC_STATIONS : ARCTIC_STATIONS, className, label }: Props) {
  const scale = R / Math.tan(d2r((90 - OUTER_LAT) / 2));
  // Rounded: server and browser maths differ in the last digit, which would break hydration.
  const round = (v: number) => Math.round(v * 100) / 100;
  const radius = (lat: number) => round(scale * Math.tan(d2r((90 - Math.abs(lat)) / 2)));
  const point = (lat: number, lng: number) => {
    const r = radius(lat);
    // South view: east clockwise from the top. North view: east anticlockwise.
    const a = d2r(lng);
    return pole === 'south' ? { x: round(C + r * Math.sin(a)), y: round(C - r * Math.cos(a)) } : { x: round(C + r * Math.sin(a)), y: round(C + r * Math.cos(a)) };
  };
  const rings = [50, 60, 70, 80];
  const meridians = Array.from({ length: 12 }, (_, i) => i * 30);

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      fill="none"
    >
      <g className="graticule-spin" style={{ transformOrigin: `${C}px ${C}px` }}>
        {rings.map((lat, i) => (
          <circle
            key={lat}
            cx={C}
            cy={C}
            r={radius(lat)}
            pathLength={1}
            className="graticule-draw"
            style={{ '--i': i } as React.CSSProperties}
            stroke="var(--glacier)"
            strokeOpacity={lat === OUTER_LAT ? 0.35 : 0.18}
            strokeWidth={1}
          />
        ))}
        {meridians.map((lng, i) => {
          const a = point(OUTER_LAT, lng);
          const b = point(86, lng);
          return (
            <line
              key={lng}
              x1={b.x}
              y1={b.y}
              x2={a.x}
              y2={a.y}
              pathLength={1}
              className="graticule-draw"
              style={{ '--i': 4 + i * 0.25 } as React.CSSProperties}
              stroke="var(--glacier)"
              strokeOpacity={lng === 0 ? 0.32 : 0.12}
              strokeWidth={1}
            />
          );
        })}
        {rings.slice(1).map((lat) => {
          const p = point(lat, 135);
          return (
            <text key={lat} x={p.x + 4} y={p.y - 4} fill="var(--mist)" fillOpacity={0.55} fontSize={11} fontFamily="var(--font-code)">
              {lat}°{pole === 'south' ? 'S' : 'N'}
            </text>
          );
        })}
      </g>
      {/* The pole */}
      <circle cx={C} cy={C} r={2.5} fill="var(--snow)" fillOpacity={0.8} />
      {stations.map((s, i) => {
        const p = point(s.lat, s.lng);
        const labelRight = p.x < C + 120;
        return (
          <g key={s.name}>
            <circle cx={p.x} cy={p.y} r={10} className="graticule-ping" style={{ '--i': i } as React.CSSProperties} fill="var(--glacier)" fillOpacity={0.25} />
            <circle cx={p.x} cy={p.y} r={3.5} fill="var(--glacier)" />
            <text
              x={labelRight ? p.x + 10 : p.x - 10}
              y={p.y + 4 + (s.name === 'Dakshin Gangotri' ? 14 : 0)}
              textAnchor={labelRight ? 'start' : 'end'}
              fill="var(--snow)"
              fillOpacity={0.8}
              fontSize={12}
              letterSpacing="0.14em"
              fontFamily="var(--font-heading)"
              fontWeight={600}
            >
              {s.name.toUpperCase()}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
