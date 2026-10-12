import 'server-only';
import { supabaseAdmin } from '../db/admin';
import { humanCheckedIds } from '../db/review';
import { loadInsights } from '../insights';
import { aiProvider, modelName } from '../ai/llm';
import summary from '@/content/eval/summary.json';

export interface ActivityRow {
  at: string;
  action: string;
  entity: string;
  entityId: string;
  actor: string | null;
  title: string | null;
}

export interface JobRow {
  at: string;
  status: string;
  title: string | null;
  assetId: string;
  seconds: number | null;
  error: string | null;
}

export interface Dashboard {
  generatedAt: string;
  engine: { provider: string; model: string; open: boolean };
  archive: {
    total: number;
    published: number;
    checked: number;
    byType: { type: string; count: number }[];
    byStatus: Record<string, number>;
    /** Cumulative published items by month (for the growth line). */
    growth: { month: string; total: number }[];
    /** Published items by the decade they come from (what the archive covers). */
    byDecade: { label: string; value: number }[];
  };
  review: { assetsReady: number; postsInReview: number; lessonsDraft: number; unchecked: number };
  ask: { days: number; total: number; answered: number; perDay: { day: string; count: number }[]; gaps: { question: string; count: number }[] };
  jobs: { completed: number; failed: number; running: number; recent: JobRow[] };
  activity: ActivityRow[];
  accuracy: typeof summary;
}

const DAY = 86_400_000;
/** Calendar day in India (the chart's days follow Indian time, not UTC). */
const istDay = (d: Date | string) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

/** Everything the staff dashboard shows, from the live database (service role; the layout checks staff). */
export async function loadDashboard(): Promise<Dashboard> {
  const db = supabaseAdmin();
  const since30 = new Date(Date.now() - 30 * DAY).toISOString();
  // Fetch a little more than 14 days; days are bucketed in Indian time below.
  const since14 = new Date(Date.now() - 15 * DAY);

  const [assetsRes, postsRes, lessonsRes, jobsRes, chatRes, auditRes, insights] = await Promise.all([
    db.from('assets').select('id, type, status, title, year, created_at, published_at'),
    db.from('content_posts').select('status'),
    db.from('lessons').select('status'),
    db.from('ai_jobs').select('asset_id, status, error, created_at, finished_at').gte('created_at', since30).order('created_at', { ascending: false }),
    db.from('chat_logs').select('created_at, cited_asset_ids').gte('created_at', since14.toISOString()),
    db.from('audit_log').select('action, entity, entity_id, actor_id, created_at').order('created_at', { ascending: false }).limit(9),
    loadInsights(30).catch(() => null),
  ]);

  const assets = assetsRes.data ?? [];
  const titleOf = new Map(assets.map((a) => [a.id as string, a.title as string]));
  const published = assets.filter((a) => a.status === 'published');
  const checked = await humanCheckedIds(published.map((a) => a.id as string));

  const count = <T,>(rows: T[], key: (r: T) => string) =>
    rows.reduce<Record<string, number>>((m, r) => ((m[key(r)] = (m[key(r)] ?? 0) + 1), m), {});
  const byTypeMap = count(published, (a) => a.type as string);
  const byStatus = count(assets, (a) => a.status as string);

  // Growth: published items per month, cumulative.
  const months = count(published, (a) => String(a.published_at ?? a.created_at).slice(0, 7));
  let running = 0;
  const growth = Object.keys(months)
    .sort()
    .map((month) => ({ month, total: (running += months[month]) }));

  // Questions per day for the last 14 days (zero-filled).
  const chats = chatRes.data ?? [];
  const perDayMap = count(chats, (c) => istDay(c.created_at as string));
  const perDay = Array.from({ length: 14 }, (_, i) => {
    const day = istDay(new Date(Date.now() - (13 - i) * DAY));
    return { day, count: perDayMap[day] ?? 0 };
  });

  const jobs = jobsRes.data ?? [];
  const recentJobs: JobRow[] = jobs.slice(0, 5).map((j) => ({
    at: j.created_at as string,
    status: j.status as string,
    title: titleOf.get(j.asset_id as string) ?? null,
    assetId: j.asset_id as string,
    seconds: j.finished_at ? Math.round((new Date(j.finished_at as string).getTime() - new Date(j.created_at as string).getTime()) / 1000) : null,
    error: (j.error as string | null) ?? null,
  }));

  const audit = auditRes.data ?? [];
  const actorIds = [...new Set(audit.map((a) => a.actor_id).filter(Boolean))] as string[];
  const { data: people } = actorIds.length ? await db.from('profiles').select('id, full_name').in('id', actorIds) : { data: [] };
  const nameOf = new Map((people ?? []).map((p) => [p.id as string, p.full_name as string]));

  const posts = postsRes.data ?? [];
  const lessons = lessonsRes.data ?? [];

  return {
    generatedAt: new Date().toISOString(),
    engine: { provider: aiProvider(), model: modelName('fast'), open: aiProvider() === 'ollama' },
    archive: {
      total: assets.length,
      published: published.length,
      checked: checked.size,
      byType: Object.entries(byTypeMap)
        .map(([type, n]) => ({ type, count: n }))
        .sort((a, b) => b.count - a.count),
      byStatus,
      growth,
      byDecade: (() => {
        const m = count(published.filter((a) => a.year), (a) => String(Math.floor(Number(a.year) / 10) * 10));
        const first = Math.min(...Object.keys(m).map(Number));
        const out: { label: string; value: number }[] = [];
        for (let d = first; d <= 2020; d += 10) out.push({ label: `${d}s`, value: m[String(d)] ?? 0 });
        return out;
      })(),
    },
    review: {
      assetsReady: byStatus.ready ?? 0,
      postsInReview: posts.filter((p) => p.status === 'in_review').length,
      lessonsDraft: lessons.filter((l) => l.status === 'draft').length,
      unchecked: published.length - checked.size,
    },
    ask: {
      days: 30,
      total: insights?.total ?? chats.length,
      answered: insights?.answered ?? chats.filter((c) => (c.cited_asset_ids ?? []).length > 0).length,
      perDay,
      gaps: (insights?.gaps ?? []).slice(0, 4).map((g) => ({ question: g.question, count: g.count })),
    },
    jobs: {
      completed: jobs.filter((j) => j.status === 'completed').length,
      failed: jobs.filter((j) => j.status === 'failed').length,
      running: jobs.filter((j) => j.status === 'pending' || j.status === 'processing').length,
      recent: recentJobs,
    },
    activity: audit.map((a) => ({
      at: a.created_at as string,
      action: a.action as string,
      entity: a.entity as string,
      entityId: a.entity_id as string,
      actor: a.actor_id ? nameOf.get(a.actor_id as string) ?? 'Staff member' : null,
      title: a.entity === 'assets' ? titleOf.get(a.entity_id as string) ?? null : null,
    })),
    accuracy: summary,
  };
}
