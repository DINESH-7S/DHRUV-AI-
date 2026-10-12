/**
 * Imports the A1 content pack through the REAL pipeline:
 *   content/events.json → 'event' assets (AI writes the Hindi summary and keywords),
 *   content/videos.json → 'video' assets (Gemini watches each video: summaries, chapters,
 *                         timestamped digest for search and Ask Dhruv citations).
 * Videos are embedded from YouTube, never downloaded. Expedition facts live in content/expeditions.json (npm run import-expeditions).
 *
 * Idempotent: items already published are skipped (use --force to re-run the AI on them).
 * Run:  npm run import-media   (optionally: -- --only=event | --only=video, -- --force, -- --limit=N videos)
 */
import { readFileSync } from 'fs';
import { supabaseAdmin } from '../lib/db/admin';
import { runIngestion } from '../lib/ai/ingest';
import type { EventSource, VideoSource } from '../lib/types/database';

interface PackVideo {
  youtube_id: string;
  url: string;
  title: string;
  title_hi: string | null;
  published: string;
  duration_s: number;
  language: 'en' | 'hi';
  region: string;
  station: string | null;
  expedition: string | null;
  role: string;
  channel: string;
  channel_url: string;
  credit: string;
  license: string;
  description: string;
}

interface PackEvent {
  slug: string;
  title: string;
  title_hi: string | null;
  starts_at: string;
  ends_at: string | null;
  venue: string;
  is_online: boolean;
  region: string;
  station: string | null;
  expedition: string | null;
  summary: string;
  source_name: string;
  source_url: string;
  extra_sources: string[];
  videos: string[];
}

const NCPOR = 'National Centre for Polar and Ocean Research (NCPOR)';
const args = process.argv.slice(2);
const only = args.find((a) => a.startsWith('--only='))?.split('=')[1];
const force = args.includes('--force');
const limit = Number(args.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? Infinity);
const db = supabaseAdmin();

async function lookups() {
  const [{ data: stations }, { data: expeditions }, { data: admin }] = await Promise.all([
    db.from('stations').select('id, name'),
    db.from('expeditions').select('id, code'),
    db.from('profiles').select('id').eq('role', 'super_admin').limit(1).maybeSingle(),
  ]);
  return {
    stationId: new Map((stations ?? []).map((s) => [s.name as string, s.id as string])),
    expeditionId: new Map((expeditions ?? []).map((e) => [e.code as string, e.id as string])),
    adminId: (admin?.id as string | undefined) ?? null,
  };
}

/** Creates the draft asset if needed, runs ingestion, publishes. Returns a one-line result. */
async function importOne(existingFilter: [string, string], row: Record<string, unknown>): Promise<string> {
  const started = Date.now();
  const { data: matches } = await db.from('assets').select('id, status').eq(...existingFilter).limit(1);
  const existing = matches?.[0];
  if (existing?.status === 'published' && !force) return 'already imported';

  let assetId = existing?.id as string | undefined;
  if (assetId) {
    // Refresh the recorded source details (the pack may have been corrected).
    const { error } = await db.from('assets').update(row).eq('id', assetId);
    if (error) throw new Error(`asset: ${error.message}`);
  } else {
    const { data, error } = await db.from('assets').insert({ ...row, status: 'draft' }).select('id').single();
    if (error) throw new Error(`asset: ${error.message}`);
    assetId = data.id as string;
  }

  const { data: job, error: jobError } = await db
    .from('ai_jobs')
    .insert({ asset_id: assetId, job_type: 'ingest', status: 'pending' })
    .select('id')
    .single();
  if (jobError) throw new Error(`job: ${jobError.message}`);
  if (existing?.status !== 'published') await db.from('assets').update({ status: 'processing' }).eq('id', assetId);

  await runIngestion(job.id, assetId);
  const { data: result } = await db.from('ai_jobs').select('status, error').eq('id', job.id).single();
  if (result?.status !== 'completed') throw new Error(result?.error ?? 'ingestion did not complete');

  // Content-pack items were verified by the team (content/CHECKLIST.md), so they are published directly.
  await db.from('assets').update({ status: 'published', published_at: new Date().toISOString() }).eq('id', assetId).neq('status', 'published');
  const { count } = await db.from('asset_chunks').select('id', { count: 'exact', head: true }).eq('asset_id', assetId);
  return `✓ ${Math.round((Date.now() - started) / 1000)}s, ${count} chunks`;
}

async function main() {
  const { stationId, expeditionId, adminId } = await (async () => {
    return lookups();
  })();
  const common = { access_level: 'public', discipline: [], created_by: adminId, file_path: null };
  let ok = 0, skipped = 0, failed = 0;

  const run = async (label: string, filter: [string, string], row: Record<string, unknown>) => {
    try {
      const outcome = await importOne(filter, row);
      if (outcome === 'already imported') skipped++;
      else ok++;
      console.log(`${label}  ${outcome}`);
    } catch (err) {
      failed++;
      console.log(`${label}  ✗ ${err instanceof Error ? err.message.slice(0, 200) : err}`);
    }
  };

  if (!only || only === 'event') {
    const { events } = JSON.parse(readFileSync('content/events.json', 'utf8')) as { events: PackEvent[] };
    for (const [n, e] of events.entries()) {
      const event: EventSource = {
        starts_at: e.starts_at,
        ends_at: e.ends_at,
        venue: e.venue,
        is_online: e.is_online,
        source_name: e.source_name,
        source_url: e.source_url,
        extra_sources: e.extra_sources,
        videos: e.videos,
      };
      await run(`[event ${n + 1}/${events.length}] ${e.title.slice(0, 58)}`, ['ai_metadata->event->>source_url', e.source_url], {
        ...common,
        type: 'event',
        title: e.title,
        title_hi: e.title_hi,
        description: `${e.summary}\n\nSource: ${e.source_name}, ${e.source_url}`,
        region: e.region,
        year: Number(e.starts_at.slice(0, 4)),
        authors: [],
        license: 'Summary written by DHRUV from the cited public source',
        station_id: e.station ? stationId.get(e.station) ?? null : null,
        expedition_id: e.expedition ? expeditionId.get(e.expedition) ?? null : null,
        // The first recording's frame is the event's picture, when there is one.
        thumbnail: e.videos[0] ? `https://i.ytimg.com/vi/${e.videos[0]}/hqdefault.jpg` : null,
        ai_metadata: { event },
      });
    }
  }

  if (!only || only === 'video') {
    const { videos } = JSON.parse(readFileSync('content/videos.json', 'utf8')) as { videos: PackVideo[] };
    // Short films first so the video page fills up early; long event recordings last.
    const ordered = [...videos].sort((a, b) => a.duration_s - b.duration_s).slice(0, limit);
    for (const [n, v] of ordered.entries()) {
      const video: VideoSource = {
        youtube_id: v.youtube_id,
        channel: v.channel,
        channel_url: v.channel_url,
        published: v.published,
        duration_s: v.duration_s,
        language: v.language,
        credit: v.credit,
      };
      const broadcaster = v.credit.startsWith('Programme by') ? ['Rajya Sabha TV (now Sansad TV)'] : [];
      await run(`[video ${n + 1}/${ordered.length}] ${v.title.slice(0, 58)}`, ['ai_metadata->video->>youtube_id', v.youtube_id], {
        ...common,
        type: 'video',
        title: v.title,
        title_hi: v.title_hi,
        description: `${v.description}\n\nSource: ${v.url} · ${v.credit}`,
        region: v.region,
        year: Number(v.published.slice(0, 4)),
        authors: [...broadcaster, NCPOR],
        license: 'Embedded from YouTube (official NCPOR channel); not downloaded',
        station_id: v.station ? stationId.get(v.station) ?? null : null,
        expedition_id: v.expedition ? expeditionId.get(v.expedition) ?? null : null,
        thumbnail: `https://i.ytimg.com/vi/${v.youtube_id}/hqdefault.jpg`,
        ai_metadata: { video },
      });
    }
  }

  console.log(`\nImported ${ok}, already there ${skipped}, failed ${failed}.${failed ? ' Re-run to retry the failures.' : ''}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
