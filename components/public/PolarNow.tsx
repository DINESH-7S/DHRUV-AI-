import React from 'react';
import Link from 'next/link';
import { Moon, Sun, SunDim, Wind } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { fetchStationWeather, sunState, weatherKey, type SunState } from '@/lib/live/polar';
import type { Station } from '@/lib/types/database';

type LiveStation = Pick<Station, 'id' | 'name' | 'name_hi' | 'lat' | 'lng' | 'region'>;

interface PolarNowProps {
  stations: LiveStation[];
  hi: boolean;
  /** 'grid' for the home page (several stations), 'single' for a station page. */
  variant?: 'grid' | 'single';
}

function SunIcon({ kind }: { kind: SunState['kind'] }) {
  const Icon = kind === 'polar_night' ? Moon : kind === 'midnight_sun' ? Sun : SunDim;
  return <Icon className="w-4 h-4 text-[var(--glacier)] shrink-0" aria-hidden />;
}

/** Live weather (Open-Meteo) and sunlight (SunCalc) at India's stations. Server-rendered, no client JS. */
export async function PolarNow({ stations, hi, variant = 'grid' }: PolarNowProps) {
  const t = await getTranslations('live');
  const tRegions = await getTranslations('regions');
  const points = stations.map((s) => ({ lat: Number(s.lat), lng: Number(s.lng) }));
  const weather = await fetchStationWeather(points);
  const fmt = (n: number) => new Intl.NumberFormat(hi ? 'hi-IN' : 'en-IN', { maximumFractionDigits: 0 }).format(n);

  const sunLine = (sun: SunState) => {
    const days = sun.daysToChange ?? 0;
    if (sun.kind === 'polar_night') return t('sun.polarNight', { days });
    if (sun.kind === 'midnight_sun') return t('sun.midnightSun', { days });
    const today = t('sun.day', { hours: sun.daylightHours });
    if (sun.nextKind === 'midnight_sun') return `${today} ${t('sun.toMidnightSun', { days })}`;
    if (sun.nextKind === 'polar_night') return `${today} ${t('sun.toPolarNight', { days })}`;
    return today;
  };

  const cards = stations.map((s, i) => {
    const wx = weather[i];
    const sun = sunState(points[i]);
    const name = (hi && s.name_hi) || s.name;
    return (
      <li key={s.id} className="rounded-2xl border border-[var(--line)] bg-[var(--navy-raised)] p-5 flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <Link href={`/stations/${s.id}`} className="font-semibold text-[var(--snow)] hover:text-[var(--glacier)]" lang={hi && s.name_hi ? 'hi' : undefined}>
            {name}
          </Link>
          <span className="text-xs text-[var(--mist)]">{tRegions(s.region)}</span>
        </div>
        {wx ? (
          <div className="space-y-1">
            <p className="flex items-baseline gap-2">
              <span className="font-display text-4xl font-semibold tabular text-[var(--snow)]">{fmt(wx.tempC)}°C</span>
              <span className="text-sm text-[var(--mist)]">{t(`wx.${weatherKey(wx.code)}`)}</span>
            </p>
            <p className="text-xs text-[var(--mist)] flex flex-wrap items-center gap-x-3 gap-y-1 tabular">
              <span>{t('feels', { temp: fmt(wx.feelsC) })}</span>
              <span className="inline-flex items-center gap-1"><Wind className="w-3.5 h-3.5" aria-hidden />{t('wind', { speed: fmt(wx.windKmh) })}</span>
              <span>{t('localTime', { time: wx.localTime.slice(11, 16) })}</span>
            </p>
          </div>
        ) : (
          <p className="text-sm text-[var(--mist)]">{t('unavailable')}</p>
        )}
        <p className="mt-auto pt-3 border-t border-[var(--line)] text-sm leading-snug flex items-start gap-2">
          <SunIcon kind={sun.kind} />
          <span>{sunLine(sun)}</span>
        </p>
      </li>
    );
  });

  return (
    <div className="space-y-3">
      <ul className={variant === 'single' ? 'grid' : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-4'}>{cards}</ul>
      <p className="text-xs text-[var(--mist)] leading-relaxed max-w-[90ch]">
        {t('credit')}{' '}
        <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-[var(--glacier)]">Open-Meteo.com</a>
        {' · '}
        <a href="https://data.ncpor.res.in/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-[var(--glacier)]">{t('ncporData')}</a>
      </p>
    </div>
  );
}
