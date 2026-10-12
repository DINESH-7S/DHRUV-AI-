import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, CircleDashed, XCircle, UploadCloud, Share2, CheckSquare, BookOpen, HelpCircle, ShieldCheck, Cpu } from 'lucide-react';
import { loadDashboard } from '@/lib/admin/dashboard';
import { getCurrentUser } from '@/lib/db/auth';
import { CountUp } from '@/components/motion/CountUp';
import { Columns, DailyBars, Ring, Tile, TypeBars } from '@/components/admin/DashCharts';
import type { UserRole } from '@/lib/types/database';
import { ACTION_LABEL } from '@/lib/admin/labels';

export const dynamic = 'force-dynamic';

const TYPE_NAMES: Record<string, string> = {
  photo: 'Photos',
  event: 'Activities',
  video: 'Videos',
  report: 'Reports',
  dataset: 'Datasets',
  publication: 'Publications',
};


const ago = (iso: string) => {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
};

const QUICK: { href: string; label: string; body: string; icon: React.ElementType; roles: UserRole[] }[] = [
  { href: '/admin/upload', label: 'Upload', body: 'Add a report, dataset or photo; AI catalogues it in English and Hindi.', icon: UploadCloud, roles: ['super_admin', 'scientist'] },
  { href: '/admin/review', label: 'Review queue', body: 'Approve or send back AI drafts before anything goes public.', icon: CheckSquare, roles: ['super_admin', 'reviewer', 'outreach_officer'] },
  { href: '/admin/studio', label: 'Content studio', body: 'Turn an archive item into news and social drafts.', icon: Share2, roles: ['super_admin', 'outreach_officer'] },
  { href: '/admin/lessons', label: 'Lessons', body: 'Generate and publish school lessons with quizzes.', icon: BookOpen, roles: ['super_admin', 'scientist', 'outreach_officer', 'reviewer'] },
];

function Panel({ title, action, children, className = '' }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`h-full rounded-md border border-[var(--line)] bg-[var(--navy)] p-5 sm:p-6 ${className}`}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="micro-cap text-[var(--snow)]">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

export default async function AdminDashboardPage() {
  const [d, user] = await Promise.all([loadDashboard(), getCurrentUser()]);
  const role = user?.role ?? 'reviewer';
  const waiting = d.review.assetsReady + d.review.postsInReview + d.review.lessonsDraft;
  const answeredPct = d.ask.total ? Math.round((d.ask.answered / d.ask.total) * 100) : 0;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const kpis = [
    { label: 'Published items', value: d.archive.published, note: `${d.archive.total} in the archive in total` },
    { label: 'Waiting for review', value: waiting, note: `${d.review.assetsReady} items · ${d.review.postsInReview} posts · ${d.review.lessonsDraft} lessons`, href: '/admin/review', tone: waiting ? 'amber' : '' },
    { label: 'Not yet checked by a person', value: d.review.unchecked, note: `${d.archive.checked} checked against their source`, href: '/admin/review', tone: d.review.unchecked ? 'amber' : '' },
    { label: `Questions, last ${d.ask.days} days`, value: d.ask.total, note: `${answeredPct}% answered with a citation`, href: '/admin/insights' },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <Tile i={0} className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--line)] pb-6">
        <div className="space-y-2">
          <p className="eyebrow">Staff workspace · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 className="text-4xl sm:text-5xl text-[var(--snow)]">{greeting}</h1>
          <p className="text-sm text-[var(--mist)]">What the archive, the review queue and Ask Dhruv look like right now.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-3 py-1.5 text-[var(--snow)]/85">
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 motion-safe:animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <Cpu className="h-3.5 w-3.5 text-[var(--mist)]" aria-hidden />
            AI engine: {d.engine.model} {d.engine.open ? '(open-source, own server)' : '(hosted, free tier)'}
          </span>
          <span className="rounded-full border border-[var(--line)] px-3 py-1.5 text-[var(--mist)] tabular">
            Updated {new Date(d.generatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </Tile>

      {/* KPI row */}
      <div className="grid overflow-hidden rounded-md border border-[var(--line)] sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k, i) => {
          const body = (
            <>
              <p className="micro-cap text-[var(--mist)]">{k.label}</p>
              <p className={`mt-3 font-display text-5xl font-bold leading-none tabular ${k.tone === 'amber' ? 'text-amber-200' : 'text-[var(--snow)]'}`}>
                <CountUp value={k.value} duration={1.4} />
              </p>
              <p className="mt-3 text-xs text-[var(--mist)]">{k.note}</p>
            </>
          );
          return (
            <Tile key={k.label} i={i + 1} className={`bg-[var(--navy)] border-[var(--line)] ${i < 3 ? 'border-b xl:border-b-0' : ''} ${i % 2 === 0 ? 'sm:border-r' : 'xl:border-r'} ${i === 3 ? 'xl:border-r-0' : ''} ${i === 2 ? 'sm:border-b-0' : ''}`}>
              {k.href ? (
                <Link href={k.href} className="group relative block h-full p-6 transition-colors duration-300 hover:bg-[var(--navy-raised)]">
                  {body}
                  <ArrowUpRight className="absolute right-5 top-5 h-4 w-4 text-[var(--mist)] transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--snow)]" aria-hidden />
                </Link>
              ) : (
                <div className="h-full p-6">{body}</div>
              )}
            </Tile>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-12">
        <Tile i={5} className="lg:col-span-5">
          <Panel title="Ask Dhruv · questions per day" action={<Link href="/admin/insights" className="micro-cap text-[var(--glacier)] hover:underline">Insights</Link>}>
            <DailyBars data={d.ask.perDay} label="Questions asked per day, last 14 days" />
          </Panel>
        </Tile>
        <Tile i={6} className="lg:col-span-4">
          <Panel title="What the archive covers">
            <Columns data={d.archive.byDecade} unit="Published items from the" />
          </Panel>
        </Tile>
        <Tile i={7} className="lg:col-span-3">
          <Panel title="Answer accuracy" action={<Link href="/accuracy" className="micro-cap text-[var(--glacier)] hover:underline">Results</Link>}>
            <div className="flex items-center gap-5">
              <Ring value={d.accuracy.totals.factsPassed} total={d.accuracy.totals.facts} label="Correct with the right source" />
              <ul className="space-y-2 text-xs text-[var(--mist)]">
                <li><span className="text-[var(--snow)] tabular">{d.accuracy.totals.refusePassed}/{d.accuracy.totals.refuse}</span> honest &ldquo;not in the archive&rdquo;</li>
                <li><span className="text-[var(--snow)] tabular">{d.accuracy.totals.langOk}/{d.accuracy.totals.questions}</span> right language</li>
                <li>Tested {new Date(d.accuracy.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</li>
              </ul>
            </div>
          </Panel>
        </Tile>
      </div>

      {/* Operations row */}
      <div className="grid gap-6 lg:grid-cols-12">
        <Tile i={8} className="lg:col-span-4">
          <Panel title="Published, by type">
            <TypeBars data={d.archive.byType} names={TYPE_NAMES} />
          </Panel>
        </Tile>

        <Tile i={9} className="lg:col-span-4">
          <Panel
            title="AI pipeline · last 30 days"
            action={
              <span className="flex items-center gap-3 text-xs tabular">
                <span className="inline-flex items-center gap-1 text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden />{d.jobs.completed} done</span>
                <span className="inline-flex items-center gap-1 text-rose-300"><XCircle className="h-3.5 w-3.5" aria-hidden />{d.jobs.failed} failed</span>
              </span>
            }
          >
            {d.jobs.recent.length === 0 ? (
              <p className="text-sm text-[var(--mist)]">No AI jobs in the last 30 days.</p>
            ) : (
              <ul className="divide-y divide-[var(--line)]">
                {d.jobs.recent.map((j, i) => (
                  <li key={i} className="flex items-start gap-3 py-3 first:pt-0">
                    {j.status === 'completed' ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-label="Completed" />
                    ) : j.status === 'failed' ? (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" aria-label="Failed" />
                    ) : (
                      <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-[var(--glacier)] motion-safe:animate-spin" aria-label="Running" />
                    )}
                    <div className="min-w-0 flex-1">
                      <Link href={`/asset/${j.assetId}`} className="block truncate text-sm text-[var(--snow)] hover:text-[var(--glacier)]">{j.title ?? j.assetId.slice(0, 8)}</Link>
                      <p className="truncate text-xs text-[var(--mist)]">
                        {j.status} · {ago(j.at)}{j.seconds !== null ? ` · ${j.seconds}s` : ''}{j.error ? ` · ${j.error}` : ''}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </Tile>

        <Tile i={10} className="lg:col-span-4">
          <Panel title="What India asks · no answer yet" action={<HelpCircle className="h-4 w-4 text-[var(--mist)]" aria-hidden />}>
            {d.ask.gaps.length === 0 ? (
              <p className="text-sm text-[var(--mist)]">Every recent question found an answer in the archive.</p>
            ) : (
              <ul className="space-y-3">
                {d.ask.gaps.map((g) => (
                  <li key={g.question} className="flex items-start justify-between gap-3 text-sm">
                    <span className="text-[var(--snow)]/90 line-clamp-2" lang={/[ऀ-ॿ]/.test(g.question) ? 'hi' : undefined}>&ldquo;{g.question}&rdquo;</span>
                    <span className="shrink-0 rounded-sm bg-white/5 px-1.5 py-0.5 font-mono text-xs text-[var(--mist)] tabular">×{g.count}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/admin/insights" className="btn-solid mt-5 inline-flex items-center gap-2 px-4 py-2 text-xs">
              Plan an explainer <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </Panel>
        </Tile>
      </div>

      {/* Activity + quick actions */}
      <div className="grid gap-6 lg:grid-cols-12">
        <Tile i={11} className="lg:col-span-7">
          <Panel title="Recent activity (audit log)" action={<ShieldCheck className="h-4 w-4 text-[var(--mist)]" aria-hidden />}>
            {d.activity.length === 0 ? (
              <p className="text-sm text-[var(--mist)]">Nothing logged yet.</p>
            ) : (
              <ol className="relative space-y-4 border-l border-[var(--line)] pl-5">
                {d.activity.map((a, i) => (
                  <li key={i} className="relative">
                    <span aria-hidden className={`absolute -left-[25px] top-1.5 h-2 w-2 rounded-full ${a.actor ? 'bg-[var(--glacier)]' : 'bg-[var(--mist)]'}`} />
                    <p className="text-sm text-[var(--snow)]">
                      <span className="font-medium">{ACTION_LABEL[a.action] ?? a.action.replace(/_/g, ' ')}</span>
                      {a.title && (
                        <>
                          {' · '}
                          <Link href={`/asset/${a.entityId}`} className="text-[var(--snow)]/80 hover:text-[var(--glacier)]">{a.title}</Link>
                        </>
                      )}
                    </p>
                    <p className="text-xs text-[var(--mist)]">{a.actor ?? 'System (import script)'} · {ago(a.at)}</p>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </Tile>

        <Tile i={12} className="lg:col-span-5">
          <Panel title="Quick actions">
            <ul className="grid gap-2">
              {QUICK.filter((q) => q.roles.includes(role)).map((q) => {
                const Icon = q.icon;
                return (
                  <li key={q.href}>
                    <Link href={q.href} className="group flex items-center gap-4 rounded-md border border-[var(--line)] p-3.5 transition-[border-color,background-color,transform] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:border-[var(--glacier)]/50 hover:bg-[var(--navy-raised)]">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--glacier)]/10 text-[var(--glacier)]">
                        <Icon className="h-5 w-5" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-display text-lg font-bold leading-tight text-[var(--snow)]">{q.label}</span>
                        <span className="block truncate text-xs text-[var(--mist)]">{q.body}</span>
                      </span>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-[var(--mist)] transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--snow)]" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </Tile>
      </div>
    </div>
  );
}
