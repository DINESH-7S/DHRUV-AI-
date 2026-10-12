"use client";

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { FileText, Download, Copy, Check, Award, ArrowLeft, BookOpen, Sparkles, ShieldAlert, Lightbulb, Table2, CalendarDays, MapPin, ExternalLink, PlayCircle } from 'lucide-react';
import type { Asset } from '@/lib/types/database';
import type { MediaLinks } from '@/lib/db/assets';
import { formatBytes, formatDay, formatTimestamp, generateAPACitation, generateBibTeXCitation } from '@/lib/utils';
import VideoPlayer from './VideoPlayer';
import { DatasetPreviewView } from './DatasetPreviewView';

interface AssetDetailViewProps {
  asset: Asset;
  related: Asset[];
  relatedMethod: 'semantic' | 'region';
  /** Staff viewing a draft/ready asset that the public cannot see yet. */
  isStaffPreview: boolean;
  preview: { kind: 'pdf' | 'image' | 'video'; url: string } | null;
  media?: MediaLinks;
  /** Start time for a video, in seconds (from ?t=). */
  startAt?: number;
  /** PDF page to open at (from an Ask Dhruv citation). */
  startPage?: number;
  /** The expedition this item belongs to, if it has a sourced expedition page. */
  expedition?: { code: string; name: string; name_hi: string | null } | null;
  /** A signed-in reviewer approved this item (not just an import script). */
  staffChecked?: boolean;
}

const humanize = (value: string) => value.replace(/_/g, ' ');

export default function AssetDetailView({ asset, related, relatedMethod, isStaffPreview, preview, media, startAt, startPage, expedition, staffChecked = false }: AssetDetailViewProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  // A cited page brings the reader straight to the document.
  useEffect(() => {
    if (startPage) previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [startPage]);
  const t = useTranslations('asset');
  const tv = useTranslations('video');
  const te = useTranslations('events');
  const tTypes = useTranslations('types');
  const tRegions = useTranslations('regions');
  const hi = useLocale() === 'hi';
  // Hindi visitors land on the Hindi summary when there is one.
  const [activeTab, setActiveTab] = useState<'scientific' | 'simple' | 'hindi'>(hi && asset.ai_summary_hi ? 'hindi' : 'scientific');
  const [citationModalOpen, setCitationModalOpen] = useState(false);
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const [downloadCount, setDownloadCount] = useState(asset.download_count ?? 0);

  const meta = asset.ai_metadata ?? {};
  const hasAiOutput = !!(asset.ai_summary || asset.ai_summary_simple || asset.ai_summary_hi);
  const video = asset.type === 'video' ? meta.video : undefined;
  const event = asset.type === 'event' ? meta.event : undefined;

  const handleCopyCitation = (text: string, format: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFormat(format);
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-24 space-y-10">
      {/* Back Link */}
      <Link href="/explore" className="micro-cap inline-flex items-center gap-2 text-[var(--mist)] hover:text-[var(--snow)]">
        <ArrowLeft className="w-4 h-4" />
        <span>{t('backToArchive')}</span>
      </Link>

      {isStaffPreview && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center space-x-3 text-amber-200 text-xs">
          <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <p>{t('staffPreview', { status: asset.status })}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Asset Detail & Preview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <div className="glass-panel rounded-md p-6 sm:p-7 space-y-4">
            <div className="flex items-center space-x-2">
              <span className="micro-cap text-[var(--glacier)]">
                {tTypes(asset.type)}
              </span>
              <span className="text-xs text-[var(--mist)] font-mono">{asset.year}</span>
              <span className="text-[var(--mist)]">•</span>
              <span className="text-xs text-[var(--mist)]">{tRegions(asset.region)}</span>
            </div>

            {/* Hindi visitors see the Hindi title first; the other language follows as a subtitle. */}
            <h1 className="normal-case tracking-normal font-display text-3xl sm:text-5xl font-bold text-[var(--snow)] leading-[1.05]" lang={hi && asset.title_hi ? 'hi' : undefined}>
              {hi && asset.title_hi ? asset.title_hi : asset.title}
            </h1>

            {asset.title_hi && (
              <p className="text-base font-medium text-[var(--glacier)]/80 font-sans" lang={hi ? undefined : 'hi'}>
                {hi ? asset.title : asset.title_hi}
              </p>
            )}

            {/* Author list & DOI */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--snow)]/80 pt-2 border-t border-[var(--line)]">
              {asset.type !== 'event' && <div>
                <span className="micro-cap block text-[var(--mist)]">{t('authors')}</span>
                <span className="font-semibold text-[var(--snow)]">{asset.authors?.filter(Boolean).length ? asset.authors.filter(Boolean).join(', ') : t('authorUnknown')}</span>
              </div>}
              {expedition && (
                <div>
                  <span className="micro-cap block text-[var(--mist)]">{t('expedition')}</span>
                  <Link href={`/expeditions/${encodeURIComponent(expedition.code)}`} className="font-semibold text-[var(--glacier)] hover:underline" lang={hi && expedition.name_hi ? 'hi' : undefined}>
                    {hi && expedition.name_hi ? expedition.name_hi : expedition.name}
                  </Link>
                </div>
              )}
              {asset.doi && (
                <div>
                  <span className="micro-cap block text-[var(--mist)]">DOI</span>
                  <a href={`https://doi.org/${asset.doi}`} target="_blank" rel="noreferrer" className="text-[var(--glacier)] font-mono hover:underline">
                    {asset.doi}
                  </a>
                </div>
              )}
            </div>
          </div>

          {video && (
            <section className="glass-panel rounded-md p-6 sm:p-7 space-y-4" aria-label={tv('player')}>
              <VideoPlayer youtubeId={video.youtube_id} title={asset.title} chapters={meta.chapters} startAt={startAt} />
              <div className="space-y-1 border-t border-[var(--line)] pt-3 text-sm text-[var(--mist)]">
                <p>
                  {tv('credit')}{' '}
                  <a href={video.channel_url} target="_blank" rel="noreferrer" className="text-[var(--snow)] hover:text-[var(--glacier)]">{video.credit}</a>
                </p>
                <p className="tabular">
                  {tv('meta', { date: formatDay(video.published, hi), length: formatTimestamp(video.duration_s) })}
                  {video.language === 'hi' && <> · {tv('inHindi')}</>}
                </p>
                {meta.analysed_seconds && (
                  <p>{tv('partlyAnalysed', { minutes: Math.round(meta.analysed_seconds / 60) })}</p>
                )}
                {media?.recordingOf && (
                  <p>
                    {tv('recordingOf')}{' '}
                    <Link href={`/asset/${media.recordingOf.id}`} className="text-[var(--glacier)] hover:underline" lang={hi && media.recordingOf.title_hi ? 'hi' : undefined}>
                      {hi && media.recordingOf.title_hi ? media.recordingOf.title_hi : media.recordingOf.title}
                    </Link>
                  </p>
                )}
              </div>
            </section>
          )}

          {event && (
            <section className="glass-panel rounded-md p-6 sm:p-7 space-y-4" aria-label={te('detailsLabel')}>
              <dl className="grid gap-4 sm:grid-cols-2 text-sm">
                <div className="flex gap-3">
                  <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-[var(--glacier)]" aria-hidden />
                  <div>
                    <dt className="text-[var(--mist)]">{te('when')}</dt>
                    <dd className="tabular text-[var(--snow)]">
                      {event.ends_at && event.ends_at !== event.starts_at
                        ? te('range', { from: formatDay(event.starts_at, hi), to: formatDay(event.ends_at, hi) })
                        : formatDay(event.starts_at, hi)}
                    </dd>
                  </div>
                </div>
                <div className="flex gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[var(--glacier)]" aria-hidden />
                  <div>
                    <dt className="text-[var(--mist)]">{te('where')}</dt>
                    <dd className="text-[var(--snow)]">{event.venue}</dd>
                  </div>
                </div>
              </dl>
              <p className="border-t border-[var(--line)] pt-3 text-sm text-[var(--mist)]">
                {te('source')}{' '}
                <a href={event.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[var(--snow)] hover:text-[var(--glacier)]">
                  {event.source_name} <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              </p>
              <a
                href={`/events/calendar.ics?id=${asset.id}`}
                download
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--glacier)] hover:underline"
              >
                <CalendarDays className="h-4 w-4" aria-hidden /> {te('addToCalendar')}
              </a>
              {media && media.recordings.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-[var(--snow)]">{te('recordings')}</h3>
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {media.recordings.map((rec) => (
                      <li key={rec.id}>
                        <Link href={`/asset/${rec.id}`} className="group flex items-center gap-3 rounded-xl border border-[var(--line)] p-2 hover:border-[var(--glacier)]/50">
                          {rec.thumbnail && <img src={rec.thumbnail} alt="" className="h-14 w-24 shrink-0 rounded-md object-cover" loading="lazy" />}
                          <span className="flex items-start gap-1.5 text-sm text-[var(--snow)] group-hover:text-[var(--glacier)]">
                            <PlayCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                            <span className="line-clamp-2" lang={hi && rec.title_hi ? 'hi' : undefined}>{hi && rec.title_hi ? rec.title_hi : rec.title}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {/* AI Summary Tabs */}
          <div className="glass-panel rounded-md p-6 sm:p-7 space-y-4">
            <div className="flex flex-wrap gap-3 items-center justify-between border-b border-[var(--line)] pb-3">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveTab('scientific')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${activeTab === 'scientific' ? 'bg-[var(--glacier)]/20 text-[var(--glacier)] border border-[var(--glacier)]/40' : 'text-[var(--mist)] hover:text-[var(--snow)]'}`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{t('scientific')}</span>
                </button>
                <button
                  onClick={() => setActiveTab('simple')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${activeTab === 'simple' ? 'bg-[var(--glacier)]/20 text-[var(--glacier)] border border-[var(--glacier)]/40' : 'text-[var(--mist)] hover:text-[var(--snow)]'}`}
                >
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t('simple')}</span>
                </button>
                <button
                  onClick={() => setActiveTab('hindi')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${activeTab === 'hindi' ? 'bg-[var(--glacier)]/20 text-[var(--glacier)] border border-[var(--glacier)]/40' : 'text-[var(--mist)] hover:text-[var(--snow)]'}`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-[var(--glacier)]" />
                  <span>{t('hindi')}</span>
                </button>
              </div>

              {hasAiOutput && (
                meta.mock ? (
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/5 text-[var(--snow)]/80 border border-[var(--line)]">
                    {t('demoAi')}
                  </span>
                ) : asset.status === 'published' && staffChecked ? (
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-400/10 text-emerald-300 border border-emerald-500/30">
                    {t('reviewed')}
                  </span>
                ) : asset.status === 'published' ? (
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/5 text-[var(--snow)]/80 border border-[var(--line)]">
                    {t('unreviewed')}
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    {t('draft')}
                  </span>
                )
              )}
            </div>

            <div className="text-sm text-[var(--snow)] leading-relaxed bg-[var(--navy-raised)]/60 p-4 rounded-xl border border-[var(--line)]">
              {activeTab === 'scientific' && (
                <p>{asset.ai_summary || asset.description}</p>
              )}
              {activeTab === 'simple' && (
                <p>{asset.ai_summary_simple || t('noSimple')}</p>
              )}
              {activeTab === 'hindi' && (
                <p className="font-sans leading-loose" lang="hi">{asset.ai_summary_hi || t('noHindi')}</p>
              )}
            </div>

            {meta.key_findings && meta.key_findings.length > 0 && (
              <div className="space-y-2">
                <h4 className="micro-cap text-[var(--snow)]/80 flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> {t('keyFindings')}
                </h4>
                <ul className="space-y-1.5 text-xs text-[var(--snow)]/80 list-disc pl-5">
                  {meta.key_findings.map((finding, i) => <li key={i}>{finding}</li>)}
                </ul>
              </div>
            )}

            {asset.ai_keywords && asset.ai_keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {asset.ai_keywords.map(keyword => (
                  <Link
                    key={keyword}
                    href={`/explore?q=${encodeURIComponent(keyword)}`}
                    className="px-2 py-0.5 rounded-md bg-[var(--navy-raised)]/80 border border-[var(--line)] text-[10px] text-[var(--snow)]/80 hover:border-[var(--glacier)]/50"
                  >
                    #{keyword}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Dataset preview: monthly chart and first rows, computed at ingestion */}
          {asset.type === 'dataset' && meta.preview && (
            <div className="glass-panel rounded-md p-6 sm:p-7 space-y-4">
              <h2 className="micro-cap text-[var(--snow)] flex items-center gap-2">
                <Table2 className="w-4 h-4 text-[var(--glacier)]" /> {t('dataPreview')}
              </h2>
              <DatasetPreviewView
                preview={meta.preview}
                hi={hi}
                labels={{
                  chartTitle: t('chartTitle'),
                  chartNote: t('chartNote'),
                  tableTitle: t('firstRows'),
                  rowsNote: t('rowsNote', { rows: meta.preview.totalRows.toLocaleString(hi ? 'hi-IN' : 'en-IN') }),
                }}
              />
            </div>
          )}

          {/* Dataset variables */}
          {meta.variables && meta.variables.length > 0 && (
            <div className="glass-panel rounded-md p-6 sm:p-7 space-y-4">
              <h3 className="micro-cap text-[var(--snow)] flex items-center gap-2">
                <Table2 className="w-4 h-4 text-[var(--glacier)]" /> {t('variables')}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-[var(--mist)] border-b border-[var(--line)]">
                    <tr><th className="py-2 pr-4">{t('variable')}</th><th className="py-2 pr-4">{t('unit')}</th><th className="py-2">{t('description')}</th></tr>
                  </thead>
                  <tbody className="text-[var(--snow)]/80">
                    {meta.variables.map(v => (
                      <tr key={v.name} className="border-b border-[var(--line)]">
                        <td className="py-2 pr-4 font-mono text-[var(--glacier)]">{v.name}</td>
                        <td className="py-2 pr-4">{v.unit}</td>
                        <td className="py-2">{v.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[var(--snow)]/80">
                {meta.temporal_coverage && <p><span className="text-[var(--mist)]">{t('timeCoverage')}</span> {meta.temporal_coverage}</p>}
                {meta.spatial_coverage && <p><span className="text-[var(--mist)]">{t('spaceCoverage')}</span> {meta.spatial_coverage}</p>}
              </div>
            </div>
          )}

          {/* Asset Preview Box (videos and events have their own panels above) */}
          {!video && !event && <div ref={previewRef} className="glass-panel rounded-md p-6 sm:p-7 space-y-4 scroll-mt-24">
            <h3 className="micro-cap text-[var(--snow)]">{t('preview')}</h3>
            {preview?.kind === 'pdf' && startPage && (
              <p className="text-sm text-[var(--glacier)]">
                {t('openedAtPage', { page: startPage })}{' '}
                <a href={`${preview.url}#page=${startPage}`} target="_blank" rel="noopener noreferrer" className="underline">{t('openPage', { page: startPage })}</a>
              </p>
            )}
            {preview?.kind === 'pdf' ? (
              <iframe key={startPage ?? 0} src={startPage ? `${preview.url}#page=${startPage}` : preview.url} title={asset.title} className="w-full h-[32rem] rounded-xl bg-[var(--ink)] border border-[var(--line)]" />
            ) : preview?.kind === 'image' ? (
              <div className="rounded-xl overflow-hidden bg-[var(--ink)] border border-[var(--line)]">
                <img src={preview.url} alt={asset.alt_text || asset.title} className="w-full max-h-[32rem] object-contain" />
              </div>
            ) : preview?.kind === 'video' ? (
              <video src={preview.url} controls className="w-full max-h-[32rem] rounded-xl bg-[var(--ink)] border border-[var(--line)]" />
            ) : asset.thumbnail ? (
              <div className="rounded-xl overflow-hidden bg-[var(--ink)] border border-[var(--line)]">
                <img src={asset.thumbnail} alt={asset.alt_text || asset.title} className="w-full max-h-96 object-cover" />
              </div>
            ) : (
              <div className="h-48 rounded-xl bg-[var(--ink)]/80 border border-[var(--line)] flex flex-col items-center justify-center space-y-3">
                <FileText className="w-10 h-10 text-[var(--mist)]/70" />
                <p className="text-xs text-[var(--mist)]">{t('noPreview')}</p>
              </div>
            )}
            {asset.ai_caption && preview?.kind === 'image' && (
              <p className="text-xs text-[var(--mist)] italic">{asset.ai_caption}</p>
            )}
          </div>}
        </div>

        {/* Right Column: Actions & Metadata Sidebar */}
        <div className="space-y-6">
          {/* Action Box */}
          <div className="glass-panel rounded-md p-6 sm:p-7 space-y-4">
            <h3 className="micro-cap text-[var(--snow)]">{t('actions')}</h3>

            {asset.file_path ? (
              <a
                href={`/api/assets/${asset.id}/download`}
                onClick={() => setDownloadCount(count => count + 1)}
                className="w-full py-3 rounded-full btn-solid text-[var(--ink)] font-bold text-xs transition-all flex items-center justify-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>{t('download')}{asset.file_size ? ` (${formatBytes(asset.file_size)})` : ''}</span>
              </a>
            ) : video || event ? (
              <a
                href={video ? `https://www.youtube.com/watch?v=${video.youtube_id}` : event!.source_url}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 rounded-xl border border-[var(--line)] text-[var(--snow)] text-xs font-semibold hover:border-[var(--glacier)] transition-colors flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" aria-hidden />
                <span>{video ? tv('watchOnYoutube') : te('openSource')}</span>
              </a>
            ) : (
              <p className="w-full py-3 rounded-xl border border-[var(--line)] text-[var(--mist)] text-xs text-center">{t('noFile')}</p>
            )}

            <button
              onClick={() => setCitationModalOpen(true)}
              className="w-full py-3 rounded-xl glass-card text-[var(--glacier)] font-semibold text-xs hover:border-[var(--glacier)] transition-all flex items-center justify-center space-x-2"
            >
              <BookOpen className="w-4 h-4" />
              <span>{t('cite')}</span>
            </button>

            <div className="flex items-center justify-between text-xs text-[var(--mist)] pt-2 border-t border-[var(--line)]">
              <span>{t('views')}: <strong className="text-[var(--glacier)]">{asset.view_count ?? 0}</strong></span>
              <span>{t('downloads')}: <strong className="text-[var(--glacier)]">{downloadCount}</strong></span>
            </div>
          </div>

          {/* Technical Metadata Card */}
          <div className="glass-panel rounded-md p-6 sm:p-7 space-y-3 text-xs">
            <h3 className="micro-cap text-[var(--snow)] mb-2">{t('metadata')}</h3>
            <div className="space-y-2 text-[var(--snow)]/80">
              <div className="flex justify-between gap-4 py-1 border-b border-[var(--line)]">
                <span className="text-[var(--mist)]">{t('license')}</span>
                <span className="font-mono text-[var(--glacier)]">{asset.license || t('licenseUnknown')}</span>
              </div>
              <div className="flex justify-between gap-4 py-1 border-b border-[var(--line)]">
                <span className="text-[var(--mist)]">{t('access')}</span>
                <span className={`font-semibold capitalize ${asset.access_level === 'restricted' ? 'text-amber-400' : 'text-emerald-400'}`}>{asset.access_level}</span>
              </div>
              <div className="flex justify-between gap-4 py-1 border-b border-[var(--line)]">
                <span className="text-[var(--mist)]">{t('disciplines')}</span>
                <span className="text-right capitalize">{asset.discipline?.length ? asset.discipline.map(humanize).join(', ') : 'N/A'}</span>
              </div>
              {meta.pages && (
                <div className="flex justify-between gap-4 py-1 border-b border-[var(--line)]">
                  <span className="text-[var(--mist)]">{t('pages')}</span>
                  <span>{meta.pages}</span>
                </div>
              )}
              <div className="flex justify-between gap-4 py-1 border-b border-[var(--line)]">
                <span className="text-[var(--mist)]">{t('fileType')}</span>
                <span className="font-mono text-[var(--mist)]">{asset.mime_type || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Related Scientific Items */}
          {related.length > 0 && (
            <div className="glass-panel rounded-md p-6 sm:p-7 space-y-3">
              <h3 className="micro-cap text-[var(--snow)]">
                {relatedMethod === 'semantic' ? t('relatedAi') : t('relatedRegion')}
              </h3>
              <div className="space-y-3">
                {related.map(rel => (
                  <Link key={rel.id} href={`/asset/${rel.id}`} className="block p-3 rounded-xl bg-[var(--navy-raised)]/60 border border-[var(--line)] hover:border-[var(--glacier)]/40 transition-colors space-y-1">
                    <p className="text-xs font-bold text-[var(--snow)] line-clamp-1">{hi && rel.title_hi ? rel.title_hi : rel.title}</p>
                    <p className="text-[10px] text-[var(--mist)]">{rel.year} • {tTypes(rel.type)}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Citation Modal */}
      {citationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--ink)]/80 backdrop-blur-md">
          <div className="glass-panel max-w-xl w-full rounded-2xl p-6 space-y-5 border border-[var(--glacier)]/30">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--snow)] aurora-gradient-text">{t('citationTitle')}</h3>
              <button onClick={() => setCitationModalOpen(false)} className="text-xs text-[var(--mist)] hover:text-[var(--snow)]">✕ {t('close')}</button>
            </div>

            {/* APA */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--glacier)]">APA Format</span>
                <button
                  onClick={() => handleCopyCitation(generateAPACitation(asset), 'APA')}
                  className="px-2.5 py-1 rounded bg-[var(--glacier)]/20 border border-[var(--glacier)]/40 text-[10px] font-bold text-[var(--glacier)] flex items-center space-x-1"
                >
                  {copiedFormat === 'APA' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedFormat === 'APA' ? t('copied') : `${t('copy')} APA`}</span>
                </button>
              </div>
              <p className="p-3 bg-[var(--navy-raised)] rounded-lg text-xs font-mono text-[var(--snow)]/80 border border-[var(--line)] leading-relaxed">
                {generateAPACitation(asset)}
              </p>
            </div>

            {/* BibTeX */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--glacier)]">BibTeX Format</span>
                <button
                  onClick={() => handleCopyCitation(generateBibTeXCitation(asset), 'BibTeX')}
                  className="px-2.5 py-1 rounded bg-[var(--glacier)]/20 border border-[var(--glacier)]/40 text-[10px] font-bold text-[var(--glacier)] flex items-center space-x-1"
                >
                  {copiedFormat === 'BibTeX' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedFormat === 'BibTeX' ? t('copied') : `${t('copy')} BibTeX`}</span>
                </button>
              </div>
              <pre className="p-3 bg-[var(--navy-raised)] rounded-lg text-[11px] font-mono text-[var(--snow)]/80 border border-[var(--line)] overflow-x-auto">
                {generateBibTeXCitation(asset)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
