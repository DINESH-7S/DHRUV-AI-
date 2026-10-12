import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Asset } from "./types/database";
import { siteUrl } from "./site";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatDate(dateString?: string): string {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Citations use only what the asset records: its own authors, year, DOI and DHRUV address.
// Assets have no publisher field, so no institution is named (items come from NCPOR,
// NSIDC, Wikimedia photographers and others), and a missing author is left out, not invented.
function assetUrl(asset: Asset): string {
  return asset.doi ? `https://doi.org/${asset.doi}` : `${siteUrl()}/asset/${asset.id}`;
}

/**
 * The 640px version of a photo thumbnail, for grids (ingestion and scripts/regen-thumbnails.ts
 * write it next to the 1280px file). Other URLs (e.g. YouTube frames) are returned unchanged.
 */
export function smallThumbnail(url: string): string {
  return /\/public-media\/thumbnails\/[^/?]+\.webp(\?|$)/.test(url) ? url.replace(/\.webp(\?.*)?$/, '-640.webp$1') : url;
}

/** "2024-05-20" → "20 May 2024" (Hindi month names for hi). Calendar dates, so formatted in UTC. */
export function formatDay(iso: string, hi: boolean, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }): string {
  return new Intl.DateTimeFormat(hi ? 'hi-IN' : 'en-IN', { ...opts, timeZone: 'UTC' }).format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));
}

/** 75 → "1:15", 3725 → "1:02:05". */
export function formatTimestamp(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(h ? 2 : 1, '0');
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** "[1:15] …" or "[1:02:05] …" at the start of a video chunk → seconds. */
export function parseTimestamp(text: string): number | null {
  const m = text.match(/^\[(?:(\d+):)?(\d{1,2}):(\d{2})\]/);
  return m ? Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + Number(m[3]) : null;
}

/** Page number from a PDF chunk's "[p. 12] " prefix (see lib/ai/chunk.ts), or null. */
export function parsePage(text: string): number | null {
  const m = text.match(/^\[p\. (\d{1,4})\] /);
  return m ? Number(m[1]) : null;
}

export function generateAPACitation(asset: Asset): string {
  const authors = asset.authors?.filter(Boolean) ?? [];
  const yearStr = asset.year ? `(${asset.year})` : "(n.d.)";
  const head = authors.length ? `${authors.join(", ")} ${yearStr}. ${asset.title}.` : `${asset.title}. ${yearStr}.`;
  return `${head} ${assetUrl(asset)}`;
}

export function generateBibTeXCitation(asset: Asset): string {
  const authors = asset.authors?.filter(Boolean) ?? [];
  const citeKey = ((authors[0]?.split(" ")?.[0] || "dhruv") + (asset.year || "")).toLowerCase().replace(/[^a-z0-9]/g, "");
  const fields = [
    authors.length ? `  author = {${authors.join(" and ")}}` : null,
    `  title = {${asset.title}}`,
    asset.year ? `  year = {${asset.year}}` : null,
    asset.doi ? `  doi = {${asset.doi}}` : null,
    `  url = {${assetUrl(asset)}}`,
  ].filter(Boolean);
  return `@misc{${citeKey},\n${fields.join(",\n")}\n}`;
}
