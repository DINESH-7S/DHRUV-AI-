import SunCalc from 'suncalc';

/**
 * "Live polar window": current weather at each station from Open-Meteo (free, CC BY 4.0,
 * model data rather than the station's own instruments) and the sun's state from suncalc
 * (computed locally, no network). Cached for 15 minutes; if Open-Meteo is unreachable the
 * sun facts still render and the weather is simply left out.
 */

export interface StationWeather {
  tempC: number;
  feelsC: number;
  windKmh: number;
  code: number;
  /** Local time at the station, "YYYY-MM-DDTHH:mm". */
  localTime: string;
}

export type SunKind = 'polar_night' | 'midnight_sun' | 'day_night';

export interface SunState {
  kind: SunKind;
  /** Hours of daylight today (0 in polar night, 24 in midnight sun). */
  daylightHours: number;
  /** Days until the state changes (e.g. until the sun rises again after polar night); null if > 1 year. */
  daysToChange: number | null;
  /** What the sun does after the change. */
  nextKind: SunKind | null;
}

interface Point {
  lat: number;
  lng: number;
}

const REVALIDATE_SECONDS = 900;
// Sun's centre at -0.833° = top edge on the horizon, with refraction (the usual sunrise definition).
const HORIZON = (-0.833 * Math.PI) / 180;

export async function fetchStationWeather(points: Point[]): Promise<(StationWeather | null)[]> {
  if (points.length === 0) return [];
  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${points.map((p) => p.lat).join(',')}&longitude=${points.map((p) => p.lng).join(',')}` +
    '&current=temperature_2m,apparent_temperature,wind_speed_10m,weather_code&timezone=auto';
  try {
    const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS }, signal: AbortSignal.timeout(4000) });
    if (!res.ok) return points.map(() => null);
    const body = await res.json();
    const list = Array.isArray(body) ? body : [body];
    return list.map((row: { current?: Record<string, number | string> }) => {
      const c = row.current;
      if (!c) return null;
      return {
        tempC: Number(c.temperature_2m),
        feelsC: Number(c.apparent_temperature),
        windKmh: Number(c.wind_speed_10m),
        code: Number(c.weather_code),
        localTime: String(c.time),
      };
    });
  } catch {
    return points.map(() => null);
  }
}

/** Sun state at solar noon and midnight of a UTC day. */
function dayKind(date: Date, p: Point): { kind: SunKind; hours: number } {
  const times = SunCalc.getTimes(date, p.lat, p.lng);
  const noon = SunCalc.getPosition(times.solarNoon, p.lat, p.lng).altitude;
  const nadir = SunCalc.getPosition(times.nadir, p.lat, p.lng).altitude;
  if (noon < HORIZON) return { kind: 'polar_night', hours: 0 };
  if (nadir > HORIZON) return { kind: 'midnight_sun', hours: 24 };
  const hours = (times.sunset.getTime() - times.sunrise.getTime()) / 3_600_000;
  return { kind: 'day_night', hours: Number.isFinite(hours) ? Math.max(0, Math.min(24, hours)) : 12 };
}

export function sunState(p: Point, now = new Date()): SunState {
  const today = dayKind(now, p);
  for (let d = 1; d <= 366; d++) {
    const next = dayKind(new Date(now.getTime() + d * 86_400_000), p);
    if (next.kind !== today.kind) {
      return { kind: today.kind, daylightHours: Math.round(today.hours * 10) / 10, daysToChange: d, nextKind: next.kind };
    }
  }
  return { kind: today.kind, daylightHours: Math.round(today.hours * 10) / 10, daysToChange: null, nextKind: null };
}

/** WMO weather code → a message key under live.wx. */
export function weatherKey(code: number): string {
  if (code === 0) return 'clear';
  if (code <= 2) return 'partly';
  if (code === 3) return 'overcast';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 57) return 'drizzle';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'storm';
  return 'unknown';
}
