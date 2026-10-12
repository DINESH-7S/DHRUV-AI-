import React from 'react';
import Link from 'next/link';
import type { Station } from '@/lib/types/database';

/** 70.767 → 70°46′ */
function dms(value: number, pos: string, neg: string): string {
  const v = Math.abs(value);
  const deg = Math.floor(v);
  const min = Math.round((v - deg) * 60);
  return `${deg}°${String(min).padStart(2, '0')}′${value >= 0 ? pos : neg}`;
}

/**
 * An endless band of India's stations with their true coordinates (from the stations table),
 * like a mission ticker. Pauses on hover; still under reduced motion. The second copy is hidden
 * from screen readers.
 */
export function StationTicker({ stations, hi, estLabel }: { stations: Station[]; hi: boolean; estLabel: (year: number) => string }) {
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {stations.map((s) => (
        <li key={s.id} className="flex items-center">
          <Link
            href={`/stations/${s.id}`}
            tabIndex={hidden ? -1 : undefined}
            className="group flex items-baseline gap-4 px-8 py-6 whitespace-nowrap"
          >
            <span className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-[0.06em] text-[var(--snow)] transition-colors duration-500 group-hover:text-[var(--glacier)]" lang={hi && s.name_hi ? 'hi' : undefined}>
              {hi && s.name_hi ? s.name_hi : s.name}
            </span>
            <span className="font-mono text-sm text-[var(--mist)] tabular">
              {dms(s.lat, 'N', 'S')} {dms(s.lng, 'E', 'W')}
            </span>
            <span className="micro-cap text-[var(--mist)]">{estLabel(s.established_year)}</span>
          </Link>
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--glacier)]" />
        </li>
      ))}
    </ul>
  );

  return (
    <div className="relative overflow-hidden border-b border-[var(--line)] [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <div className="marquee">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
