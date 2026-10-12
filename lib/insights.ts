import 'server-only';
import { supabaseAdmin } from './db/admin';

/** Questions whose answer cited nothing: the archive could not answer them. */
export interface GapQuestion {
  question: string;
  count: number;
  lastAsked: string;
  hindi: boolean;
}

export interface CitedItem {
  id: string;
  title: string;
  count: number;
}

export interface Insights {
  days: number;
  total: number;
  answered: number;
  gaps: GapQuestion[];
  popular: { question: string; count: number }[];
  cited: CitedItem[];
}

const DEVANAGARI = /[ऀ-ॿ]/;

/** The same question asked with different case or punctuation counts once. */
function normalise(q: string): string {
  return q.toLowerCase().replace(/[\s\p{P}]+/gu, ' ').trim();
}

/** Rows garbled by a mis-encoded client ("?????") are noise, not questions. */
function isGarbled(q: string): boolean {
  const marks = (q.match(/\?/g) ?? []).length;
  return marks > 3 && marks / q.length > 0.3;
}

function group(rows: { question: string; created_at: string }[]) {
  const map = new Map<string, { question: string; count: number; lastAsked: string }>();
  for (const r of rows) {
    const key = normalise(r.question);
    const g = map.get(key);
    if (g) {
      g.count++;
      if (r.created_at > g.lastAsked) g.lastAsked = r.created_at;
    } else map.set(key, { question: r.question.trim(), count: 1, lastAsked: r.created_at });
  }
  return [...map.values()].sort((a, b) => b.count - a.count || b.lastAsked.localeCompare(a.lastAsked));
}

/** What visitors asked Ask Dhruv in the last `days` days, and what the archive could not answer. */
export async function loadInsights(days = 30): Promise<Insights> {
  const db = supabaseAdmin();
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data, error } = await db
    .from('chat_logs')
    .select('question, cited_asset_ids, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(2000);
  if (error) throw new Error(error.message);
  const rows = ((data ?? []) as { question: string; cited_asset_ids: string[] | null; created_at: string }[]).filter(
    (r) => !isGarbled(r.question),
  );

  const unanswered = rows.filter((r) => !r.cited_asset_ids?.length);
  const gaps = group(unanswered).map((g) => ({ ...g, hindi: DEVANAGARI.test(g.question) }));
  const popular = group(rows)
    .slice(0, 8)
    .map(({ question, count }) => ({ question, count }));

  const citeCounts = new Map<string, number>();
  for (const r of rows) for (const id of new Set((r.cited_asset_ids ?? []).filter(Boolean))) citeCounts.set(id, (citeCounts.get(id) ?? 0) + 1);
  const top = [...citeCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  let titles: { id: string; title: string }[] = [];
  if (top.length) {
    const res = await db.from('assets').select('id, title').in('id', top.map(([id]) => id));
    titles = (res.data ?? []) as { id: string; title: string }[];
  }
  const titleOf = new Map(titles.map((t) => [t.id, t.title]));
  const cited = top.filter(([id]) => titleOf.has(id)).map(([id, count]) => ({ id, title: titleOf.get(id)!, count }));

  return { days, total: rows.length, answered: rows.length - unanswered.length, gaps, popular, cited };
}
