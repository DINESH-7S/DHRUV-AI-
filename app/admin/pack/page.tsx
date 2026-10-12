import React from 'react';
import Link from 'next/link';
import {
  ArrowUpRight, FileText, Globe2, MessagesSquare, Newspaper, Megaphone, Mail, Share2, GraduationCap, UploadCloud, ShieldCheck,
} from 'lucide-react';
import { Tile } from '@/components/admin/DashCharts';
import { CountUp } from '@/components/motion/CountUp';
import { loadPack, loadPackChoices, type OutputStatus, type PackOutput, type TrailRow } from '@/lib/admin/pack';

export const dynamic = 'force-dynamic';

const ICON: Record<PackOutput['kind'], React.ElementType> = {
  summary: FileText,
  page: Globe2,
  search: MessagesSquare,
  article: Newspaper,
  press: Megaphone,
  newsletter: Mail,
  social: Share2,
  lesson: GraduationCap,
};

const STATUS: Record<OutputStatus, { label: string; tone: string }> = {
  published: { label: 'Live', tone: 'border-emerald-400/40 text-emerald-200 bg-emerald-400/10' },
  approved: { label: 'Approved', tone: 'border-[var(--glacier)]/40 text-[var(--glacier)] bg-[var(--glacier)]/10' },
  scheduled: { label: 'Scheduled', tone: 'border-[var(--glacier)]/40 text-[var(--glacier)] bg-[var(--glacier)]/10' },
  ready: { label: 'Ready to publish', tone: 'border-[var(--glacier)]/40 text-[var(--glacier)] bg-[var(--glacier)]/10' },
  in_review: { label: 'Waiting for approval', tone: 'border-amber-300/40 text-amber-200 bg-amber-300/10' },
  draft: { label: 'Draft', tone: 'border-[var(--line)] text-[var(--mist)] bg-white/[0.03]' },
  rejected: { label: 'Sent back', tone: 'border-rose-400/40 text-rose-200 bg-rose-400/10' },
};

const TYPE_LABEL: Record<string, string> = {
  report: 'Report', publication: 'Paper', dataset: 'Dataset', photo: 'Photo', video: 'Video', event: 'Event', news: 'News',
};

const date = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
const mb = (bytes: number) => `${(bytes / 1_048_576).toFixed(1)} MB`;

export default async function PackPage({ searchParams }: { searchParams: Promise<{ asset?: string }> }) {
  const { asset: requested } = await searchParams;
  const choices = await loadPackChoices(6);
  const assetId = requested ?? choices[0]?.id;
  const pack = assetId ? await loadPack(assetId) : null;

  if (!pack) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 py-16">
        <p className="eyebrow">Upload once, get everything</p>
        <h1 className="text-4xl text-[var(--snow)]">Nothing to show yet</h1>
        <p className="text-[var(--mist)]">
          Upload an item, then make posts in the content studio or a lesson in Lessons. This page then shows everything that one upload became.
        </p>
        <Link href="/admin/upload" className="btn-ghost inline-flex">Upload an item</Link>
      </div>
    );
  }

  const { asset, outputs, trail } = pack;
  const named = outputs.filter((o) => o.approvedBy).length;
  const live = outputs.filter((o) => o.status === 'published').length;
  const languages = new Set(outputs.flatMap((o) => o.languages)).size;
  const stats = [
    { label: 'Outputs from one upload', value: outputs.length, note: live === outputs.length ? 'All live on the portal' : `${live} live, ${outputs.length - live} waiting for a person` },
    { label: 'Languages', value: languages, note: 'English and Hindi from the same upload' },
    pack.catalogueSeconds
      ? { label: 'AI catalogue ready in', value: pack.catalogueSeconds, suffix: ' s', note: 'Summary, keywords and search passages' }
      : { label: 'Search passages', value: pack.passages, note: 'Made when the file was catalogued' },
    { label: 'Approved by a named person', value: named, note: named === outputs.length ? `All ${outputs.length} outputs` : `of ${outputs.length}. The rest were approved in test sessions or still wait` },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Header */}
      <header className="admin-head flex flex-wrap items-end justify-between gap-6 border-b border-[var(--line)] pb-6">
        <div className="space-y-2">
          <p className="eyebrow">Upload once, get everything</p>
          <h1 className="text-4xl sm:text-6xl text-[var(--snow)]">
            One upload. <span className="text-[var(--glacier)] tabular">{outputs.length}</span> outputs.
          </h1>
          <p className="max-w-[62ch] text-sm leading-relaxed text-[var(--mist)]">
            Everything below was made from a single uploaded file by DHRUV&apos;s AI, and each piece waits for a person to approve it before the public sees it. Read live from the database.
          </p>
        </div>
      </header>

      {/* Which upload */}
      {choices.length > 1 && (
        <nav aria-label="Choose an upload" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          {choices.map((c) => (
            <Link key={c.id} href={`/admin/pack?asset=${c.id}`} aria-current={c.id === asset.id ? 'page' : undefined} className="chip max-w-[18rem] shrink-0" title={c.title}>
              <span className="block truncate">{c.title}</span>
            </Link>
          ))}
        </nav>
      )}

      {/* Stats */}
      <div className="grid overflow-hidden rounded-md border border-[var(--line)] sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s, i) => (
          <Tile key={s.label} i={i + 1} className={`bg-[var(--navy)] p-6 border-[var(--line)] ${i < 3 ? 'border-b xl:border-b-0' : ''} ${i % 2 === 0 ? 'sm:border-r' : 'xl:border-r'} ${i === 3 ? 'xl:border-r-0' : ''} ${i === 2 ? 'sm:border-b-0' : ''}`}>
            <p className="micro-cap text-[var(--mist)]">{s.label}</p>
            <p className="mt-3 font-display text-5xl font-bold leading-none tabular text-[var(--snow)]">
              <CountUp value={s.value} duration={1.4} />
              {'suffix' in s && <span className="text-2xl text-[var(--mist)]">{s.suffix}</span>}
            </p>
            <p className="mt-3 text-xs text-[var(--mist)]">{s.note}</p>
          </Tile>
        ))}
      </div>

      {/* The flow: the upload on the left, what it became on the right */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,21rem)_minmax(0,1fr)] lg:items-start">
        <Tile i={5} className="lg:sticky lg:top-8">
          <section aria-label="The upload" className="rounded-md border border-[var(--glacier)]/35 bg-[var(--navy-raised)] p-6 shadow-[0_30px_80px_-40px_rgba(91,191,230,0.35)]">
            <div className="flex items-center justify-between gap-3">
              <p className="micro-cap flex items-center gap-2 text-[var(--glacier)]">
                <UploadCloud className="h-4 w-4" aria-hidden /> The upload
              </p>
              <span className="micro-cap rounded-full border border-[var(--line)] px-2.5 py-1 text-[var(--mist)]">{TYPE_LABEL[asset.type] ?? asset.type}</span>
            </div>
            <h2 className="mt-5 font-display text-3xl font-bold uppercase leading-[0.95] tracking-[0.01em] text-[var(--snow)]">{asset.title}</h2>
            <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-[var(--line)] pt-5 text-sm">
              {asset.fileSize ? (
                <div>
                  <dt className="micro-cap text-[var(--mist)]">File</dt>
                  <dd className="mt-1 tabular text-[var(--snow)]">{mb(asset.fileSize)}</dd>
                </div>
              ) : null}
              {asset.pages ? (
                <div>
                  <dt className="micro-cap text-[var(--mist)]">Pages</dt>
                  <dd className="mt-1 tabular text-[var(--snow)]">{asset.pages}</dd>
                </div>
              ) : null}
              <div>
                <dt className="micro-cap text-[var(--mist)]">Uploaded</dt>
                <dd className="mt-1 tabular text-[var(--snow)]">{date(asset.createdAt)}</dd>
              </div>
              <div>
                <dt className="micro-cap text-[var(--mist)]">Checked by a person</dt>
                <dd className={`mt-1 ${asset.checkedByPerson ? 'text-emerald-200' : 'text-amber-200'}`}>{asset.checkedByPerson ? 'Yes' : 'Not yet'}</dd>
              </div>
            </dl>
            {asset.keywords.length > 0 && (
              <div className="mt-5 space-y-2">
                <p className="micro-cap text-[var(--mist)]">AI keywords</p>
                <ul className="flex flex-wrap gap-1.5">
                  {asset.keywords.map((k) => (
                    <li key={k} className="rounded-full border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--snow)]/80">{k}</li>
                  ))}
                </ul>
              </div>
            )}
            <Link href={`/asset/${asset.id}`} className="micro-cap mt-6 inline-flex items-center gap-1.5 text-[var(--glacier)] hover:underline">
              Open the public page <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </section>
        </Tile>

        <section aria-label="What it became" className="relative">
          {/* The rail from the upload down through every output */}
          <div aria-hidden className="pack-rail absolute bottom-6 left-[1.1rem] top-6 w-px bg-gradient-to-b from-[var(--glacier)] via-[var(--glacier)]/40 to-[var(--line)]">
            <span className="pack-pulse absolute -left-[1.5px] h-16 w-[4px] rounded-full bg-gradient-to-b from-transparent via-[var(--glacier)] to-transparent opacity-0" />
          </div>
          <ol className="space-y-3">
            {outputs.map((o, i) => {
              const Icon = ICON[o.kind];
              const s = STATUS[o.status];
              const body = (
                <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-x-6 gap-y-3 rounded-md border border-[var(--line)] bg-[var(--navy)] p-4 transition-colors duration-300 group-hover:border-[var(--glacier)]/50 group-hover:bg-[var(--navy-raised)] sm:p-5">
                  <div className="min-w-0 space-y-1">
                    <p className="font-display text-xl font-bold uppercase tracking-[0.02em] text-[var(--snow)]">
                      {o.label}
                      <span className="ml-2 align-middle text-xs font-normal normal-case tracking-normal text-[var(--mist)]">{o.languages.join(' · ')}</span>
                    </p>
                    <p className="text-sm text-[var(--mist)]">{o.detail}</p>
                  </div>
                  <div className="flex flex-col items-start gap-1.5 sm:items-end">
                    <span className={`micro-cap rounded-full border px-2.5 py-1 ${s.tone}`}>{s.label}</span>
                    {o.approvedBy && o.approvedAt && (
                      <span className="flex items-center gap-1.5 text-xs text-[var(--snow)]/75">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" aria-hidden /> {o.approvedBy} · {date(o.approvedAt)}
                      </span>
                    )}
                  </div>
                </div>
              );
              return (
                <li key={o.key} className="relative flex items-center gap-4">
                  <span
                    aria-hidden
                    style={{ '--i': i } as React.CSSProperties}
                    className="pack-node relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--glacier)]/50 bg-[var(--ink)] text-[var(--glacier)]"
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  {o.href ? (
                    <Link href={o.href} className="group flex min-w-0 flex-1">{body}</Link>
                  ) : (
                    <div className="flex min-w-0 flex-1">{body}</div>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      </div>

      {/* Who did what */}
      <Tile i={6}>
        <section aria-labelledby="trail" className="rounded-md border border-[var(--line)] bg-[var(--navy)] p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="trail" className="micro-cap text-[var(--snow)]">Who did what · audit log</h2>
            <p className="text-xs text-[var(--mist)]">Every step is recorded with the person who took it.</p>
          </div>
          {trail.length === 0 ? (
            <p className="text-sm text-[var(--mist)]">No steps recorded yet.</p>
          ) : (
            <TrailList rows={trail.slice(0, TRAIL_SHOWN)} />
          )}
          {trail.length > TRAIL_SHOWN && (
            <details className="group mt-2">
              <summary className="micro-cap cursor-pointer list-none py-3 text-[var(--glacier)] hover:underline">
                <span className="group-open:hidden">Show all {trail.length} steps</span>
                <span className="hidden group-open:inline">Show fewer</span>
              </summary>
              <TrailList rows={trail.slice(TRAIL_SHOWN)} />
            </details>
          )}
        </section>
      </Tile>
    </div>
  );
}

const TRAIL_SHOWN = 8;

function TrailList({ rows }: { rows: TrailRow[] }) {
  return (
    <ol className="divide-y divide-[var(--line)]">
      {rows.map((r, i) => (
        <li key={i} className="grid gap-1 py-3 text-sm sm:grid-cols-[9rem_minmax(0,1fr)_minmax(0,14rem)] sm:gap-4">
          <span className="tabular text-xs text-[var(--mist)] sm:text-sm">{dateTime(r.at)}</span>
          <span className="text-[var(--snow)]">
            <span className="font-medium">{r.label}</span>
            {r.what && <span className="text-[var(--snow)]/70"> · {r.what}</span>}
          </span>
          <span className={`text-xs sm:text-right sm:text-sm ${r.actor.startsWith('No name') ? 'text-[var(--mist)]/80' : r.actor === 'DHRUV AI' ? 'text-[var(--glacier)]' : 'text-emerald-200'}`}>
            {r.actor}
          </span>
        </li>
      ))}
    </ol>
  );
}
