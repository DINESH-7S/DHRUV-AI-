/**
 * Readers for NCPOR's own public channels, so new material reaches the review queue without
 * anyone re-typing it. Every item keeps a link to where it was found.
 * - NCPOR's official YouTube channel (Atom feed, latest 15 videos)
 * - NCPOR news (RSS with full text, plus the news listing for each item's link)
 * PIB was tried and left out: its RSS redirects by location, carries titles only, and was empty
 * for English on 26 Sep 2026.
 * Feeds are parsed with small regular expressions: they are simple, and this adds no dependency.
 */

export const NCPOR_YOUTUBE_CHANNEL = 'UC1h2xM-VmB1opmtTa4IreQQ';
const YOUTUBE_FEED = `https://www.youtube.com/feeds/videos.xml?channel_id=${NCPOR_YOUTUBE_CHANNEL}`;
const NCPOR_NEWS_RSS = 'https://ncpor.res.in/upload/rssfeed/news.xml';
const NCPOR_NEWS_LIST = 'https://ncpor.res.in/news';


export type HarvestSource = 'youtube' | 'ncpor-news';

export interface HarvestItem {
  source: HarvestSource;
  /** Stable link to the item where it was found. */
  url: string;
  title: string;
  /** Full text or description, as published. */
  text: string;
  /** ISO date the source gives for the item. */
  published: string;
  youtubeId?: string;
}

const NAMED: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“',
  ndash: '–', mdash: '—', hellip: '…', deg: '°', middot: '·',
};

export function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => NAMED[name.toLowerCase()] ?? m);
}

const tag = (xml: string, name: string) => {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`));
  return m ? decodeEntities(m[1]).trim() : '';
};
const blocks = (xml: string, name: string) => xml.match(new RegExp(`<${name}[\\s>][\\s\\S]*?</${name}>`, 'g')) ?? [];
const plain = (html: string) => decodeEntities(html.replace(/<[^>]+>/g, ' ')).replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
const normTitle = (s: string) => decodeEntities(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

async function get(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'DHRUV outreach portal prototype (SIH26063)' },
    signal: AbortSignal.timeout(20_000),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  return res.text();
}

export async function youtubeVideos(): Promise<HarvestItem[]> {
  const xml = await get(YOUTUBE_FEED);
  return blocks(xml, 'entry').map((e) => {
    const id = tag(e, 'yt:videoId');
    return {
      source: 'youtube' as const,
      url: `https://www.youtube.com/watch?v=${id}`,
      title: tag(e, 'title'),
      text: tag(e, 'media:description'),
      published: tag(e, 'published'),
      youtubeId: id,
    };
  });
}

/** Length of a public YouTube video from its watch page; null if the page does not say. */
export async function youtubeDuration(id: string): Promise<number | null> {
  try {
    const html = await get(`https://www.youtube.com/watch?v=${id}`);
    const m = html.match(/"lengthSeconds":"(\d+)"/);
    return m ? Number(m[1]) : null;
  } catch {
    return null;
  }
}

/** NCPOR news from the last `days` days, with the link to each item's page. */
export async function ncporNews(days: number): Promise<HarvestItem[]> {
  const [rss, list] = await Promise.all([get(NCPOR_NEWS_RSS), get(NCPOR_NEWS_LIST)]);
  // The RSS items carry no link: find each one on the news listing by its title.
  const links = new Map<string, string>();
  for (const m of list.matchAll(/<a href="\/news\/view\/(\d+)"[^>]*title="([^"]*)"/g)) {
    links.set(normTitle(m[2]), `https://ncpor.res.in/news/view/${m[1]}`);
  }
  const since = Date.now() - days * 86_400_000;
  return blocks(rss, 'item')
    .map((item) => {
      const title = tag(item, 'title');
      const date = new Date(tag(item, 'pubDate'));
      return { title, date, text: plain(tag(item, 'description')), url: links.get(normTitle(title)) };
    })
    .filter((i) => i.url && !Number.isNaN(i.date.getTime()) && i.date.getTime() >= since)
    .map((i) => ({ source: 'ncpor-news' as const, url: i.url!, title: i.title, text: i.text, published: i.date.toISOString() }));
}


/** Region by keywords; staff correct it before publishing. */
export function guessRegion(text: string): { region: 'antarctic' | 'arctic' | 'himalaya' | 'southern_ocean'; guessed: boolean } {
  if (/\b(Arctic|Svalbard|Himadri|Ny-?Ålesund|Ny-?Alesund)\b/i.test(text)) return { region: 'arctic', guessed: false };
  if (/\b(Himalaya\w*|Himansh|Chandra|Lahaul|Spiti|glacier)\b/i.test(text)) return { region: 'himalaya', guessed: false };
  if (/\b(Antarctic\w*|Maitri|Bharati|Dakshin Gangotri|South Pole)\b/i.test(text)) return { region: 'antarctic', guessed: false };
  if (/\b(ocean|sea|Sagar|beach|coast\w*)\b/i.test(text)) return { region: 'southern_ocean', guessed: true };
  return { region: 'antarctic', guessed: true };
}
