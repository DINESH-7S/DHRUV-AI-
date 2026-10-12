"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, X } from 'lucide-react';
import type { Station } from '@/lib/types/database';
import type { GlobeFocus, GlobePoint } from './GlobeCanvas';

// three.js (~600 KB) loads only once the browser is idle; until then a still poster of the same
// view is shown (public/globe/poster.webp, made by scripts/globe-poster.mjs).
const GlobeCanvas = dynamic(() => import('./GlobeCanvas'), { ssr: false, loading: () => null });

/** Southern view that shows India (NCPOR, Goa) and the routes down to Antarctica. */
const HOME_VIEW: GlobeFocus = { lat: -22, lng: 58, altitude: 2.35 };

const REGION_COLOR: Record<Station['region'], string> = {
  antarctic: '#5bbfe6',
  southern_ocean: '#5bbfe6',
  arctic: '#a7e3f7',
  himalaya: '#e8c07d',
};

interface GlobeViewerProps {
  stations: Station[];
  className?: string;
  /** Live air temperature by station id (Open-Meteo, from the server). */
  temps?: Record<string, number>;
}

/** −14°C with a true minus sign. */
const fmtTemp = (c: number) => `${Math.round(c) < 0 ? '−' : ''}${Math.abs(Math.round(c))}°C`;

export function GlobeViewer({ stations, className = 'h-[520px]', temps = {} }: GlobeViewerProps) {
  const t = useTranslations('globe');
  const tRegions = useTranslations('regions');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [load, setLoad] = useState(false);
  const [drawn, setDrawn] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setNarrow(e.contentRect.width < 640));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // three.js (~580 KB) loads only when the globe is about to scroll into view, then when the
  // browser is idle: visitors who never reach it never pay for it (it was 2.7 s of main-thread
  // blocking on a budget phone when it loaded on idle at page start).
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    let idle = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = () => setLoad(true);
        if ('requestIdleCallback' in window) idle = window.requestIdleCallback(start, { timeout: 800 });
        else start();
      },
      { rootMargin: '400px 0px' },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (idle && 'cancelIdleCallback' in window) window.cancelIdleCallback(idle);
    };
  }, []);
  const selected = stations.find(s => s.id === selectedId) ?? null;

  const points = useMemo<GlobePoint[]>(
    () => stations.map(st => ({ id: st.id, name: st.name, lat: Number(st.lat), lng: Number(st.lng), color: REGION_COLOR[st.region], label: st.status !== 'decommissioned', active: st.status === 'active', temp: temps[st.id] !== undefined ? fmtTemp(temps[st.id]) : undefined, labelLeft: st.name === 'Maitri' || st.name_hi === 'मैत्री' })),
    [stations, temps],
  );

  const focus = useMemo<GlobeFocus>(
    () => {
      // Narrow boxes (phones) sit the camera closer, or the globe shrinks to a marble.
      const near = narrow ? 0.7 : 1;
      return selected
        ? { lat: Number(selected.lat), lng: Number(selected.lng), altitude: 1.5 * near }
        : { ...HOME_VIEW, altitude: HOME_VIEW.altitude * (narrow ? 0.72 : 1) };
    },
    [selected, narrow],
  );

  return (
    <div ref={boxRef} className={`relative w-full overflow-hidden rounded-md border border-[var(--line)] bg-[radial-gradient(90%_70%_at_50%_45%,#0c2238_0%,#03080f_72%)] ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/globe/poster.webp"
        alt=""
        aria-hidden
        decoding="async"
        className={`absolute inset-0 w-full h-full object-contain pointer-events-none transition-opacity duration-700 ${drawn ? 'opacity-0' : 'opacity-100'}`}
      />
      {!drawn && <span className="sr-only">{t('loading')}</span>}
      {(load || selectedId) && (
        <GlobeCanvas points={points} focus={focus} onSelect={setSelectedId} hqLabel={t('hq')} onReady={() => setDrawn(true)} />
      )}

      {/* Station quick selector */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&>*]:shrink-0 sm:flex-wrap sm:overflow-visible">
        <span className="eyebrow px-2">{t('stations')}</span>
        {stations.map(st => (
          <button
            key={st.id}
            onClick={() => setSelectedId(st.id === selectedId ? null : st.id)}
            aria-pressed={st.id === selectedId}
            className="chip backdrop-blur-sm"
          >
            {st.name}
          </button>
        ))}
      </div>

      <div className="absolute bottom-4 left-5 space-y-1 text-[11px] text-[var(--mist)] pointer-events-none">
        <p className="flex items-center gap-2">
          <span className="relative flex h-2 w-2" aria-hidden>
            <span className="absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-60 motion-safe:animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-300" />
          </span>
          {t('dayNight')}
        </p>
        <p>{t('hint')} · {t('imagery')}</p>
      </div>

      {/* Station detail card */}
      {selected && (
        <div className="absolute bottom-4 right-4 left-4 sm:left-auto sm:w-80 p-5 rounded-md border border-[var(--line)] bg-[var(--ink)]/90 backdrop-blur-md shadow-2xl space-y-3 z-20">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow">{tRegions(selected.region)}</p>
              <h3 className="font-display text-2xl font-bold uppercase tracking-[0.06em] text-[var(--snow)] mt-1">{selected.name}</h3>
              {temps[selected.id] !== undefined && (
                <p className="mt-1 font-display text-3xl font-bold tabular text-[var(--glacier)]">{fmtTemp(temps[selected.id])} <span className="text-xs font-sans font-normal text-[var(--mist)]">{t('now')}</span></p>
              )}
              <p className="text-[11px] text-[var(--mist)] font-mono tabular mt-0.5">
                {t('established', { year: selected.established_year })}, {Number(selected.lat).toFixed(2)}°, {Number(selected.lng).toFixed(2)}°
              </p>
            </div>
            <button
              onClick={() => setSelectedId(null)}
              aria-label={t('close')}
              className="p-1.5 rounded-lg text-[var(--mist)] hover:text-[var(--snow)] hover:bg-white/5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-sm text-[var(--snow)]/80 leading-relaxed line-clamp-4">{selected.description}</p>

          <Link
            href={`/stations/${selected.id}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--glacier)] hover:gap-2.5"
          >
            {t('explore')} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
