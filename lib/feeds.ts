import type { Asset, ContentPost } from './types/database';
import { resolveSiteLinks, siteUrl } from './site';

/** RSS 2.0 and iCalendar (RFC 5545) builders for news and institutional activities. */

const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Markdown → plain text, good enough for feed summaries. */
function plain(md: string): string {
  return md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#*_>`]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function postTitle(post: ContentPost): string {
  const heading = post.body.match(/^#{1,3}\s+(.+)$/m)?.[1];
  const text = plain(heading ?? post.body);
  return text.length > 110 ? `${text.slice(0, 107)}…` : text;
}

export function newsRss(posts: ContentPost[], hi: boolean): string {
  const site = siteUrl();
  const items = posts
    .map((p) => {
      const body = plain(resolveSiteLinks(p.body));
      const link = `${site}/asset/${p.asset_id}`;
      return [
        '<item>',
        `<title>${xml(postTitle(p))}</title>`,
        `<link>${xml(link)}</link>`,
        `<guid isPermaLink="false">dhruv-post-${p.id}</guid>`,
        `<pubDate>${new Date(p.published_at ?? p.created_at).toUTCString()}</pubDate>`,
        `<description>${xml(body.length > 600 ? `${body.slice(0, 597)}…` : body)}</description>`,
        '</item>',
      ].join('');
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${hi ? 'DHRUV समाचार' : 'DHRUV news'}</title>
<link>${site}/news</link>
<atom:link href="${site}/news/rss.xml" rel="self" type="application/rss+xml"/>
<description>${xml(
    hi
      ? 'NCPOR की संग्रहीत सामग्री से DHRUV के AI द्वारा तैयार कहानियाँ। DHRUV एक SIH26063 प्रोटोटाइप है, आधिकारिक समाचार सेवा नहीं।'
      : "Stories drafted by DHRUV's AI from archived NCPOR material. DHRUV is an SIH26063 prototype, not an official news service.",
  )}</description>
<language>${hi ? 'hi' : 'en-in'}</language>
${items}
</channel>
</rss>
`;
}

// iCalendar text: escape, and fold lines at 75 octets.
const ics = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (Buffer.byteLength(rest, 'utf8') > 75) {
    let cut = 75;
    while (Buffer.byteLength(rest.slice(0, cut), 'utf8') > 75) cut--;
    out.push(rest.slice(0, cut));
    rest = ' ' + rest.slice(cut);
  }
  out.push(rest);
  return out.join('\r\n');
}

const day = (iso: string) => iso.slice(0, 10).replace(/-/g, '');

function nextDay(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** All-day VEVENTs for event assets (DTEND is exclusive, so a one-day event ends the next day). */
export function eventsIcs(events: Asset[], name: string): string {
  const site = siteUrl();
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//DHRUV SIH26063 prototype//EN', 'CALSCALE:GREGORIAN', `X-WR-CALNAME:${ics(name)}`];
  for (const a of events) {
    const e = a.ai_metadata?.event;
    if (!e?.starts_at) continue;
    const summary = a.ai_summary || a.description;
    lines.push(
      'BEGIN:VEVENT',
      `UID:dhruv-event-${a.id}@dhruv`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${day(e.starts_at)}`,
      `DTEND;VALUE=DATE:${day(nextDay(e.ends_at || e.starts_at))}`,
      `SUMMARY:${ics(a.title)}`,
      `LOCATION:${ics(e.venue)}`,
      `DESCRIPTION:${ics(`${summary}\n\nSource: ${e.source_name}, ${e.source_url}\nOn DHRUV: ${site}/asset/${a.id}`)}`,
      `URL:${site}/asset/${a.id}`,
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
