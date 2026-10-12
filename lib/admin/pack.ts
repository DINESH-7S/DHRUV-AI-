import 'server-only';
import { supabaseAdmin } from '../db/admin';
import { humanCheckedIds } from '../db/review';
import { ACTION_LABEL } from './labels';

/**
 * "Upload once, get everything": what one uploaded item became. Everything here is read from the
 * live database (service role; the admin layout checks staff), nothing is illustrative.
 */

export type OutputStatus = 'draft' | 'in_review' | 'approved' | 'scheduled' | 'published' | 'rejected' | 'ready';

export interface PackOutput {
  key: string;
  kind: 'summary' | 'page' | 'search' | 'article' | 'press' | 'newsletter' | 'social' | 'lesson';
  label: string;
  detail: string;
  languages: string[];
  status: OutputStatus;
  href: string | null;
  /** Name of the signed-in person who approved it, when one is recorded. */
  approvedBy: string | null;
  approvedAt: string | null;
}

export interface TrailRow {
  at: string;
  label: string;
  actor: string;
  what: string | null;
}

export interface Pack {
  asset: {
    id: string;
    title: string;
    type: string;
    status: string;
    fileSize: number | null;
    pages: number | null;
    createdAt: string;
    keywords: string[];
    checkedByPerson: boolean;
  };
  /** Seconds from upload to the AI catalogue being ready, when the job was tracked. */
  catalogueSeconds: number | null;
  /** Searchable passages Ask Dhruv can cite. */
  passages: number;
  outputs: PackOutput[];
  trail: TrailRow[];
}

export interface PackChoice {
  id: string;
  title: string;
  outputs: number;
}

const CHANNEL: Record<string, { kind: PackOutput['kind']; label: string }> = {
  blog: { kind: 'article', label: 'Website article' },
  press_release: { kind: 'press', label: 'Press release' },
  newsletter: { kind: 'newsletter', label: 'Newsletter item' },
  x: { kind: 'social', label: 'X post' },
  instagram: { kind: 'social', label: 'Instagram post' },
  linkedin: { kind: 'social', label: 'LinkedIn post' },
  facebook: { kind: 'social', label: 'Facebook post' },
};
const CHANNEL_ORDER = ['blog', 'press_release', 'newsletter', 'x', 'instagram', 'linkedin', 'facebook'];
/** Least finished first: a group shows the status of its least finished post. */
const STATUS_RANK: OutputStatus[] = ['rejected', 'draft', 'in_review', 'approved', 'scheduled', 'ready', 'published'];
/** Actions only the AI or an import performs; everything else is a person's decision. */
const MACHINE_ACTIONS = new Set(['ai_ingest_completed', 'campaign_generated', 'lesson_generated', 'post_sent_telegram', 'post_telegram_failed']);
const APPROVAL_ACTIONS = new Set(['post_approve', 'lesson_publish', 'asset_publish', 'asset_verify']);

const LANG = (l: string) => (l === 'hi' ? 'Hindi' : 'English');

/** The items with the most outputs, for the picker; the first is the default. */
export async function loadPackChoices(limit = 8): Promise<PackChoice[]> {
  const db = supabaseAdmin();
  const [posts, lessons] = await Promise.all([
    db.from('content_posts').select('asset_id'),
    db.from('lessons').select('asset_id'),
  ]);
  const count = new Map<string, number>();
  for (const r of [...(posts.data ?? []), ...(lessons.data ?? [])]) count.set(r.asset_id, (count.get(r.asset_id) ?? 0) + 1);
  const ids = [...count.keys()];
  if (!ids.length) return [];
  const { data: assets } = await db.from('assets').select('id, title').in('id', ids);
  return (assets ?? [])
    .map((a) => ({ id: a.id as string, title: a.title as string, outputs: count.get(a.id) ?? 0 }))
    .sort((a, b) => b.outputs - a.outputs)
    .slice(0, limit);
}

export async function loadPack(assetId: string): Promise<Pack | null> {
  const db = supabaseAdmin();
  const { data: asset } = await db
    .from('assets')
    .select('id, title, type, status, file_size, created_at, ai_summary, ai_summary_hi, ai_keywords, ai_metadata, alt_text')
    .eq('id', assetId)
    .maybeSingle();
  if (!asset) return null;

  const [postsRes, lessonsRes, chunksRes, jobsRes, checked] = await Promise.all([
    db.from('content_posts').select('id, channel, language, status, published_at, created_at').eq('asset_id', assetId),
    db.from('lessons').select('id, title, grade_band, language, status, quizzes(questions)').eq('asset_id', assetId),
    db.from('asset_chunks').select('content').eq('asset_id', assetId),
    db.from('ai_jobs').select('status, created_at, finished_at').eq('asset_id', assetId).eq('status', 'completed').order('created_at').limit(1),
    humanCheckedIds([assetId]),
  ]);
  const posts = postsRes.data ?? [];
  const lessons = lessonsRes.data ?? [];
  const chunks = chunksRes.data ?? [];

  const entityIds = [assetId, ...posts.map((p) => p.id), ...lessons.map((l) => l.id)];
  const { data: audit } = await db
    .from('audit_log')
    .select('action, actor_id, entity, entity_id, created_at')
    .in('entity_id', entityIds)
    .order('created_at');
  const actorIds = [...new Set((audit ?? []).map((a) => a.actor_id).filter(Boolean))] as string[];
  const { data: profiles } = actorIds.length ? await db.from('profiles').select('id, full_name').in('id', actorIds) : { data: [] };
  const nameOf = new Map((profiles ?? []).map((p) => [p.id as string, p.full_name as string]));

  /** Latest approval of an entity by a named, signed-in person. */
  const approval = (ids: string[]) => {
    const rows = (audit ?? []).filter((a) => ids.includes(a.entity_id) && APPROVAL_ACTIONS.has(a.action) && a.actor_id);
    const last = rows[rows.length - 1];
    return last ? { approvedBy: nameOf.get(last.actor_id) ?? 'Staff member', approvedAt: last.created_at as string } : { approvedBy: null, approvedAt: null };
  };

  const published = asset.status === 'published';
  const assetStatus: OutputStatus = published ? 'published' : asset.status === 'ready' ? 'ready' : 'draft';
  const assetApproval = approval([assetId]);
  const pageNumbers = new Set(chunks.map((c) => /^\[p\. (\d{1,4})\] /.exec(c.content as string)?.[1]).filter(Boolean));
  const meta = (asset.ai_metadata ?? {}) as { pages?: number };

  const outputs: PackOutput[] = [];
  if (asset.ai_summary) {
    outputs.push({
      key: 'summary-en', kind: 'summary', label: 'Summary', languages: ['English'], status: assetStatus, href: `/asset/${assetId}`,
      detail: `${(asset.ai_keywords ?? []).length} keywords${asset.alt_text ? ', alt text' : ''}`, ...assetApproval,
    });
  }
  if (asset.ai_summary_hi) {
    outputs.push({ key: 'summary-hi', kind: 'summary', label: 'Summary', languages: ['Hindi'], status: assetStatus, href: `/asset/${assetId}`, detail: 'For Hindi readers, on the same page', ...assetApproval });
  }
  outputs.push({
    key: 'page', kind: 'page', label: 'Public archive page', languages: ['English', 'Hindi'], status: assetStatus,
    href: `/asset/${assetId}`, detail: 'Preview, download, citation and licence', ...assetApproval,
  });
  if (chunks.length) {
    outputs.push({
      key: 'search', kind: 'search', label: 'Ask Dhruv knowledge', languages: ['English', 'Hindi'], status: assetStatus,
      href: '/ask',
      detail: pageNumbers.size ? `${chunks.length} passages from ${pageNumbers.size} pages, cited to the page` : `${chunks.length} searchable passages`,
      approvedBy: null, approvedAt: null,
    });
  }

  // One output per channel; its languages and the least finished status of its posts.
  const byChannel = new Map<string, typeof posts>();
  for (const p of posts) byChannel.set(p.channel, [...(byChannel.get(p.channel) ?? []), p]);
  for (const channel of CHANNEL_ORDER) {
    const group = byChannel.get(channel);
    if (!group) continue;
    const status = group.map((p) => p.status as OutputStatus).sort((a, b) => STATUS_RANK.indexOf(a) - STATUS_RANK.indexOf(b))[0];
    const website = channel === 'blog' || channel === 'press_release';
    outputs.push({
      key: `post-${channel}`,
      kind: CHANNEL[channel].kind,
      label: CHANNEL[channel].label,
      languages: [...new Set(group.map((p) => LANG(p.language)))].sort(),
      status,
      href: website && status === 'published' ? '/news' : '/admin/review',
      detail: website ? (status === 'published' ? 'On /news and the RSS feed' : 'For /news and the RSS feed') : status === 'approved' || status === 'published' ? 'Carries a QR code that proves it is genuine' : 'Waiting for a second person to approve',
      ...approval(group.map((p) => p.id)),
    });
  }

  for (const l of lessons) {
    const quiz = (l.quizzes as { questions: unknown[] }[] | null)?.[0];
    outputs.push({
      key: `lesson-${l.id}`, kind: 'lesson', label: 'Lesson for students', languages: [LANG(l.language)],
      status: l.status === 'published' ? 'published' : 'draft',
      href: l.status === 'published' ? `/learn/${l.id}` : '/admin/lessons',
      detail: `Class ${l.grade_band}${quiz ? `, ${quiz.questions.length}-question quiz and certificate` : ''}`,
      ...approval([l.id]),
    });
  }

  const titleOf = new Map<string, string>([
    ...posts.map((p) => [p.id, `${CHANNEL[p.channel]?.label ?? p.channel} (${LANG(p.language)})`] as [string, string]),
    ...lessons.map((l) => [l.id, `Lesson: ${l.title}`] as [string, string]),
  ]);
  const trail: TrailRow[] = (audit ?? []).map((a) => ({
    at: a.created_at,
    label: ACTION_LABEL[a.action] ?? a.action.replace(/_/g, ' '),
    actor: a.actor_id ? nameOf.get(a.actor_id) ?? 'Staff member' : MACHINE_ACTIONS.has(a.action) ? 'DHRUV AI' : 'No name recorded (test session)',
    what: a.entity_id === assetId ? null : titleOf.get(a.entity_id) ?? null,
  }));

  const job = jobsRes.data?.[0];
  const catalogueSeconds = job?.finished_at ? Math.max(1, Math.round((+new Date(job.finished_at) - +new Date(asset.created_at)) / 1000)) : null;

  return {
    asset: {
      id: asset.id,
      title: asset.title,
      type: asset.type,
      status: asset.status,
      fileSize: asset.file_size,
      pages: meta.pages ?? null,
      createdAt: asset.created_at,
      keywords: (asset.ai_keywords ?? []).slice(0, 8),
      checkedByPerson: checked.has(assetId),
    },
    catalogueSeconds,
    passages: chunks.length,
    outputs,
    trail,
  };
}
