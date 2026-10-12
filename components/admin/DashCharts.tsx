'use client';

import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { EASE } from '@/components/motion/Reveal';

/*
 * Dashboard charts (dataviz method): one hue for a single series (glacier), thin marks with 4px
 * rounded data-ends and 2px gaps, recessive axes, a hover tooltip on every mark, values in text
 * tokens (never the series colour). Motion: marks grow from the baseline once, transform only.
 */

const fmtDay = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

/** Questions per day: 14 vertical bars with a hover readout. */
export function DailyBars({ data, label }: { data: { day: string; count: number }[]; label: string }) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.count));
  const focus = hover ?? data.length - 1;
  return (
    <figure className="space-y-3" aria-label={label}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-display text-3xl font-bold tabular text-[var(--snow)]">{data[focus]?.count ?? 0}</p>
        <p className="text-xs text-[var(--mist)] tabular">{data[focus] ? fmtDay(data[focus].day) : ''}</p>
      </div>
      <div className="relative flex h-28 items-end gap-[2px]" onMouseLeave={() => setHover(null)}>
        {data.map((d, i) => (
          <button
            key={d.day}
            type="button"
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            aria-label={`${fmtDay(d.day)}: ${d.count}`}
            className="group relative flex h-full flex-1 items-end focus:outline-none"
          >
            <motion.span
              initial={reduce ? false : { scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.25 + i * 0.035 }}
              style={{ height: `${Math.max(3, (d.count / max) * 100)}%`, transformOrigin: 'bottom' }}
              className={`block w-full rounded-t-[4px] transition-colors duration-200 ${i === focus ? 'bg-[var(--glacier)]' : 'bg-[var(--glacier)]/35 group-hover:bg-[var(--glacier)]/60'}`}
            />
          </button>
        ))}
      </div>
      <div className="flex justify-between text-[11px] text-[var(--mist)] tabular">
        <span>{data[0] ? fmtDay(data[0].day) : ''}</span>
        <span>{data.at(-1) ? fmtDay(data.at(-1)!.day) : ''}</span>
      </div>
    </figure>
  );
}

/** Labelled columns (e.g. items by decade) with a hover readout above. */
export function Columns({ data, unit }: { data: { label: string; value: number }[]; unit: string }) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const focus = hover ?? data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0);
  return (
    <figure className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-display text-3xl font-bold tabular text-[var(--snow)]">{data[focus]?.value ?? 0}</p>
        <p className="text-xs text-[var(--mist)]">{unit} · {data[focus]?.label}</p>
      </div>
      <div className="flex h-28 items-end gap-2" onMouseLeave={() => setHover(null)}>
        {data.map((d, i) => (
          <button
            key={d.label}
            type="button"
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            aria-label={`${d.label}: ${d.value}`}
            className="group flex h-full flex-1 items-end focus:outline-none"
          >
            <motion.span
              initial={reduce ? false : { scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.3 + i * 0.07 }}
              style={{ height: `${Math.max(3, (d.value / max) * 100)}%`, transformOrigin: 'bottom' }}
              className={`block w-full rounded-t-[4px] transition-colors duration-200 ${i === focus ? 'bg-[var(--glacier)]' : 'bg-[var(--glacier)]/35 group-hover:bg-[var(--glacier)]/60'}`}
            />
          </button>
        ))}
      </div>
      <div className="flex gap-2 text-[11px] text-[var(--mist)] tabular">
        {data.map((d) => (
          <span key={d.label} className="flex-1 text-center">{d.label}</span>
        ))}
      </div>
    </figure>
  );
}

/** Published items by type: horizontal bars, direct labels (name left, value right). */
export function TypeBars({ data, names }: { data: { type: string; count: number }[]; names: Record<string, string> }) {
  const reduce = useReducedMotion();
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <ul className="space-y-3">
      {data.map((d, i) => (
        <li key={d.type} className="group space-y-1.5" title={`${names[d.type] ?? d.type}: ${d.count}`}>
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-[var(--snow)]/85">{names[d.type] ?? d.type}</span>
            <span className="font-mono tabular text-[var(--snow)]">{d.count}</span>
          </div>
          <div className="h-2 rounded-full bg-white/[0.04]">
            <motion.div
              initial={reduce ? false : { scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1, ease: EASE, delay: 0.3 + i * 0.06 }}
              style={{ width: `${(d.count / max) * 100}%`, transformOrigin: 'left' }}
              className="h-2 rounded-full bg-[var(--glacier)]/70 transition-colors duration-300 group-hover:bg-[var(--glacier)]"
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Cumulative published items: a line that draws in, with a hover crosshair. */
export function GrowthLine({ data, label }: { data: { month: string; total: number }[]; label: string }) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);
  if (data.length < 2) return <p className="text-sm text-[var(--mist)]">{label}</p>;
  const W = 520;
  const H = 150;
  const pad = 6;
  const max = Math.max(...data.map((d) => d.total));
  const x = (i: number) => pad + (i / (data.length - 1)) * (W - pad * 2);
  const y = (v: number) => H - pad - (v / max) * (H - pad * 2);
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.total).toFixed(1)}`).join(' ');
  const area = `${line} L${x(data.length - 1)},${H} L${x(0)},${H} Z`;
  const focus = hover ?? data.length - 1;
  const monthName = (m: string) => new Date(m + '-01T00:00:00').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

  return (
    <figure className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-display text-3xl font-bold tabular text-[var(--snow)]">{data[focus].total}</p>
        <p className="text-xs text-[var(--mist)] tabular">{monthName(data[focus].month)}</p>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-36 w-full overflow-visible"
        role="img"
        aria-label={label}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const i = Math.round(((e.clientX - r.left) / r.width) * (data.length - 1));
          setHover(Math.max(0, Math.min(data.length - 1, i)));
        }}
      >
        <defs>
          <linearGradient id="growth-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--glacier)" stopOpacity="0.22" />
            <stop offset="1" stopColor="var(--glacier)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={0} x2={W} y1={H * f} y2={H * f} stroke="var(--line)" strokeWidth={1} />
        ))}
        <motion.path d={area} fill="url(#growth-fill)" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2, delay: 0.6 }} />
        <motion.path
          d={line}
          fill="none"
          stroke="var(--glacier)"
          strokeWidth={2}
          strokeLinejoin="round"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.6, ease: EASE, delay: 0.2 }}
        />
        <line x1={x(focus)} x2={x(focus)} y1={0} y2={H} stroke="var(--snow)" strokeOpacity={0.25} strokeDasharray="3 3" />
        <circle cx={x(focus)} cy={y(data[focus].total)} r={4.5} fill="var(--ink)" stroke="var(--glacier)" strokeWidth={2} />
      </svg>
    </figure>
  );
}

/** A 0-100% ring (accuracy), drawn in once. */
export function Ring({ value, total, label }: { value: number; total: number; label: string }) {
  const reduce = useReducedMotion();
  const pct = total ? value / total : 0;
  const r = 40;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-28 w-28 shrink-0" role="img" aria-label={`${label}: ${value}/${total}`}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx={50} cy={50} r={r} fill="none" stroke="var(--line)" strokeWidth={7} />
        <motion.circle
          cx={50}
          cy={50}
          r={r}
          fill="none"
          stroke="var(--glacier)"
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={reduce ? false : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: 1.6, ease: EASE, delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-bold tabular text-[var(--snow)]">{Math.round(pct * 100)}%</span>
        <span className="text-[10px] text-[var(--mist)] tabular">{value}/{total}</span>
      </div>
    </div>
  );
}

/**
 * Staggered entrance for dashboard tiles (wave from the top left). CSS keyframes (.rise), not
 * JavaScript, so the numbers are visible in the first paint instead of after hydration.
 */
export function Tile({ i = 0, className = '', children }: { i?: number; className?: string; children: React.ReactNode }) {
  return (
    <section style={{ '--i': i } as React.CSSProperties} className={`rise ${className}`}>
      {children}
    </section>
  );
}
