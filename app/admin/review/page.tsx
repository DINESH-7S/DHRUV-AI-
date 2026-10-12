"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CheckCircle, XCircle, ShieldAlert, ExternalLink, AlertCircle, Eye, Globe } from 'lucide-react';
import { ContentPost, PostStatus } from '@/lib/types/database';
import { fetchStaffAssets, fetchStaffPosts, setAssetStatus, updatePost, type StaffAsset } from '@/lib/db/staff-client';
import { allowedPostActions, type PostAction } from '@/lib/db/workflow';
import { resolveSiteLinks } from '@/lib/site';
import { PostQR } from '@/components/admin/PostQR';
import { VERIFIABLE_STATUSES } from '@/lib/posts/code';

const QUEUE_STATUSES: PostStatus[] = ['in_review', 'approved', 'scheduled'];

export default function ReviewQueuePage() {
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [readyAssets, setReadyAssets] = useState<StaffAsset[]>([]);
  const [uncheckedAssets, setUncheckedAssets] = useState<StaffAsset[]>([]);
  const [reviewerNotes, setReviewerNotes] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [delivered, setDelivered] = useState<Record<string, { ok: boolean; url?: string; error?: string }>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [queue, assets, unchecked] = await Promise.all([
          fetchStaffPosts(QUEUE_STATUSES),
          fetchStaffAssets(['ready']),
          fetchStaffAssets(['published'], { unchecked: true }),
        ]);
        setPosts(queue);
        setReadyAssets(assets);
        setUncheckedAssets(unchecked);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Could not load the review queue.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleAction = async (post: ContentPost, action: PostAction) => {
    setBusyId(post.id);
    setErrors(prev => ({ ...prev, [post.id]: '' }));
    try {
      const updated = await updatePost(post.id, action, { note: reviewerNotes[post.id] || undefined });
      setPosts(prev => prev.map(p => (p.id === post.id ? updated : p)));
      // Social posts go live on DHRUV's Telegram channel when it is configured (lib/social/telegram.ts).
      const telegram = (updated as ContentPost & { telegram?: { ok: boolean; url?: string; error?: string } }).telegram;
      if (telegram) setDelivered(prev => ({ ...prev, [post.id]: telegram }));
    } catch (err) {
      setErrors(prev => ({ ...prev, [post.id]: err instanceof Error ? err.message : 'Action failed.' }));
    } finally {
      setBusyId(null);
    }
  };

  const handlePublishAsset = async (asset: StaffAsset) => {
    setBusyId(asset.id);
    setErrors(prev => ({ ...prev, [asset.id]: '' }));
    try {
      await setAssetStatus(asset.id, 'publish');
      setReadyAssets(prev => prev.filter(a => a.id !== asset.id));
    } catch (err) {
      setErrors(prev => ({ ...prev, [asset.id]: err instanceof Error ? err.message : 'Publishing failed.' }));
    } finally {
      setBusyId(null);
    }
  };

  const handleVerifyAsset = async (asset: StaffAsset, action: 'verify' | 'unpublish') => {
    setBusyId(asset.id);
    setErrors(prev => ({ ...prev, [asset.id]: '' }));
    try {
      await setAssetStatus(asset.id, action);
      setUncheckedAssets(prev => prev.filter(a => a.id !== asset.id));
      if (action === 'unpublish') setReadyAssets(prev => [{ ...asset, status: 'ready' }, ...prev]);
    } catch (err) {
      setErrors(prev => ({ ...prev, [asset.id]: err instanceof Error ? err.message : 'Could not record the check.' }));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="admin-head border-b border-[var(--line)] pb-6">
        <p className="eyebrow">Archive</p>
        <h1 className="mt-2 text-4xl sm:text-5xl text-[var(--snow)]">Review queue</h1>
        <p className="text-sm text-[var(--mist)] mt-3 max-w-3xl">
          Review and approve AI-generated posts and newly processed assets before anything reaches the public.
        </p>
      </div>

      {/* Human-in-the-loop mandate alert */}
      <div className="p-4 rounded-xl bg-[var(--glacier)]/10 border border-[var(--glacier)]/30 flex items-center space-x-3 text-[var(--glacier)] text-xs">
        <ShieldAlert className="w-5 h-5 text-[var(--glacier)] flex-shrink-0" />
        <p>
          <strong>Two-person rule:</strong> no AI draft is published without a human approval, and the person who generated a post cannot approve it.
        </p>
      </div>

      {loadError && (
        <div role="alert" className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center space-x-3 text-rose-300 text-xs">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {/* Assets awaiting publication */}
      {readyAssets.length > 0 && (
        <div className="space-y-3">
          <h2 className="micro-cap text-[var(--snow)]">Assets awaiting publication ({readyAssets.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {readyAssets.map(asset => (
              <div key={asset.id} className="glass-panel rounded-md p-4 space-y-3 border border-[var(--line)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-[var(--snow)] line-clamp-2">{asset.title}</p>
                    <p className="text-[10px] text-[var(--mist)] uppercase mt-1">{asset.type} • {asset.year} • {asset.access_level}</p>
                  </div>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">ready</span>
                </div>
                {asset.ai_summary && <p className="text-[11px] text-[var(--mist)] line-clamp-3">{asset.ai_summary}</p>}
                {errors[asset.id] && <p className="text-[11px] text-rose-300">{errors[asset.id]}</p>}
                <div className="flex items-center justify-between pt-2 border-t border-[var(--line)]">
                  <Link href={`/asset/${asset.id}`} className="text-xs text-[var(--glacier)] hover:underline flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" /> Preview
                  </Link>
                  <button
                    onClick={() => handlePublishAsset(asset)}
                    disabled={busyId === asset.id}
                    className="px-3 py-1.5 rounded-lg bg-emerald-400/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold hover:bg-emerald-400/30 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>{busyId === asset.id ? 'Publishing...' : 'Publish Asset'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Published by an import script: public, but no person has checked them yet */}
      {uncheckedAssets.length > 0 && (
        <div className="space-y-3">
          <h2 className="micro-cap text-[var(--snow)]">Live but not yet checked by a person ({uncheckedAssets.length})</h2>
          <p className="text-xs text-[var(--mist)] max-w-3xl">
            These items were loaded by an import script. Their pages say &ldquo;not yet checked by DHRUV staff&rdquo; until you open each one,
            compare the AI summary with the linked source, and mark it as checked. If something is wrong, take it off the site: it moves back to &ldquo;awaiting publication&rdquo; above.
          </p>
          <ul className="divide-y divide-slate-800 border-y border-[var(--line)]">
            {uncheckedAssets.map(asset => (
              <li key={asset.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <span className="text-[10px] font-bold uppercase w-20 text-[var(--mist)]">{asset.type}</span>
                <Link href={`/asset/${asset.id}`} target="_blank" className="flex-1 min-w-[12rem] text-xs text-[var(--snow)] hover:text-[var(--glacier)] flex items-center gap-1.5">
                  <span className="line-clamp-1">{asset.title}</span> <ExternalLink className="w-3 h-3 shrink-0" />
                </Link>
                {errors[asset.id] && <span className="text-[11px] text-rose-300">{errors[asset.id]}</span>}
                <button
                  onClick={() => handleVerifyAsset(asset, 'unpublish')}
                  disabled={busyId === asset.id}
                  className="px-3 py-1.5 rounded-lg text-rose-300 border border-rose-500/30 text-xs font-bold hover:bg-rose-500/10 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Take off site</span>
                </button>
                <button
                  onClick={() => handleVerifyAsset(asset, 'verify')}
                  disabled={busyId === asset.id}
                  className="px-3 py-1.5 rounded-lg bg-emerald-400/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold hover:bg-emerald-400/30 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{busyId === asset.id ? 'Saving...' : 'Mark as checked'}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Queue items */}
      <div className="space-y-6">
        <h2 className="micro-cap text-[var(--snow)]">Posts</h2>
        {loading ? (
          <div className="glass-panel p-8 text-center text-xs text-[var(--mist)]">Loading review queue...</div>
        ) : posts.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-2xl text-xs text-[var(--mist)]">
            No posts waiting for review. Generate a campaign in the Content Studio and submit it.
          </div>
        ) : (
          posts.map(post => {
            const actions = allowedPostActions(post.status);
            const busy = busyId === post.id;
            return (
              <div key={post.id} className="glass-panel rounded-md p-6 space-y-4 border border-[var(--line)]">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-3">
                  <div className="flex items-center space-x-2">
                    <span className="micro-cap text-[var(--glacier)]">
                      {post.channel.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-[var(--mist)] font-mono">Language: {post.language.toUpperCase()}</span>
                    {post.asset && (
                      <Link href={`/asset/${post.asset.id}`} className="text-xs text-[var(--mist)] hover:text-[var(--glacier)] line-clamp-1 max-w-xs">
                        from: {post.asset.title}
                      </Link>
                    )}
                  </div>

                  <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-md ${post.status === 'approved' ? 'bg-emerald-400/10 text-emerald-300 border border-emerald-500/30' : post.status === 'published' ? 'bg-[var(--glacier)]/10 text-[var(--glacier)] border border-[var(--glacier)]/30' : post.status === 'rejected' ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30' : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'}`}>
                    {post.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Body Content */}
                <div className="p-4 rounded-xl bg-[var(--ink)] border border-[var(--line)] text-xs text-[var(--snow)] whitespace-pre-wrap leading-relaxed" lang={post.language}>
                  {resolveSiteLinks(post.body)}
                  {post.hashtags?.length > 0 && <p className="mt-3 text-[var(--glacier)]">{post.hashtags.join(' ')}</p>}
                </div>

                {VERIFIABLE_STATUSES.includes(post.status) && <PostQR post={post} sourceTitle={post.asset?.title} />}

                {/* Reviewer Note Input */}
                {(actions.includes('approve') || actions.includes('reject')) && (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-[var(--snow)]/80">Reviewer Note (required to reject)</label>
                    <input
                      type="text"
                      placeholder="e.g. Please remove the second paragraph and recheck the station name."
                      value={reviewerNotes[post.id] ?? ''}
                      onChange={e => setReviewerNotes({ ...reviewerNotes, [post.id]: e.target.value })}
                      className="w-full bg-[var(--navy-raised)] border border-[var(--line)] rounded-lg px-3 py-2 text-xs text-[var(--snow)] focus:outline-none focus:border-[var(--glacier)]"
                    />
                  </div>
                )}
                {post.review_note && <p className="text-[11px] text-[var(--mist)]">Last note: {post.review_note}</p>}
                {delivered[post.id] && (
                  <p className={`text-xs ${delivered[post.id].ok ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {delivered[post.id].ok ? 'Posted to the DHRUV Telegram channel. ' : `Telegram did not accept the post: ${delivered[post.id].error}`}
                    {delivered[post.id].url && (
                      <a href={delivered[post.id].url} target="_blank" rel="noopener noreferrer" className="underline">Open it</a>
                    )}
                  </p>
                )}
                {errors[post.id] && (
                  <p className="text-[11px] text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-md p-2">{errors[post.id]}</p>
                )}

                {/* Approval Actions */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)]">
                  <div className="flex items-center space-x-2">
                    {actions.includes('approve') && (
                      <button
                        onClick={() => handleAction(post, 'approve')}
                        disabled={busy}
                        className="px-4 py-2 rounded-lg bg-emerald-400/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold hover:bg-emerald-400/30 flex items-center space-x-1.5 transition-all disabled:opacity-50"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Approve Post</span>
                      </button>
                    )}
                    {actions.includes('reject') && (
                      <button
                        onClick={() => handleAction(post, 'reject')}
                        disabled={busy}
                        className="px-4 py-2 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold hover:bg-rose-500/30 flex items-center space-x-1.5 transition-all disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                    )}
                  </div>

                  {actions.includes('publish') && (
                    <button
                      onClick={() => handleAction(post, 'publish')}
                      disabled={busy}
                      className="px-4 py-2 rounded-full btn-solid text-[var(--ink)] text-xs font-bold transition-all flex items-center space-x-1.5 disabled:opacity-50"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Publish Now to Public Site</span>
                    </button>
                  )}
                  {post.status === 'published' && (
                    <span className="text-xs text-[var(--glacier)] flex items-center gap-1.5"><Globe className="w-4 h-4" /> Live on the public site</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
