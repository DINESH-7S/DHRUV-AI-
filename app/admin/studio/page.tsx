"use client";

import React, { useState, useEffect } from 'react';
import { Sparkles, Copy, Check, AlertCircle, Send } from 'lucide-react';
import { ContentPost, SocialChannel } from '@/lib/types/database';
import { fetchStaffAssets, fetchStaffPosts, generateCampaign, updatePost, type StaffAsset } from '@/lib/db/staff-client';
import { resolveSiteLinks } from '@/lib/site';
import { PostQR } from '@/components/admin/PostQR';
import { VERIFIABLE_STATUSES } from '@/lib/posts/code';

const LANGUAGE_OPTIONS = { en: ['en'], hi: ['hi'], both: ['en', 'hi'] } as const;

export default function ContentStudioPage() {
  const [assets, setAssets] = useState<StaffAsset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [selectedChannels, setSelectedChannels] = useState<SocialChannel[]>(['x', 'instagram', 'linkedin', 'press_release']);
  const [language, setLanguage] = useState<keyof typeof LANGUAGE_OPTIONS>('en');
  const [generating, setGenerating] = useState(false);
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyPostId, setBusyPostId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        // Campaigns can be drafted from AI-processed assets before they are published.
        const [astData, existingPosts] = await Promise.all([
          fetchStaffAssets(['ready', 'published']),
          fetchStaffPosts(['draft', 'rejected', 'in_review', 'approved', 'scheduled', 'published']),
        ]);
        setAssets(astData);
        if (astData.length > 0) setSelectedAssetId(astData[0].id);
        setPosts(existingPosts);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load the studio.');
      }
    }
    loadData();
  }, []);

  const handleChannelToggle = (channel: SocialChannel) => {
    if (selectedChannels.includes(channel)) {
      setSelectedChannels(selectedChannels.filter(c => c !== channel));
    } else {
      setSelectedChannels([...selectedChannels, channel]);
    }
  };

  const handleGenerateCampaign = async () => {
    if (!selectedAssetId || selectedChannels.length === 0) return;
    setGenerating(true);
    setError(null);

    try {
      const newPosts = await generateCampaign({
        assetId: selectedAssetId,
        channels: selectedChannels,
        languages: [...LANGUAGE_OPTIONS[language]],
      });
      setPosts(prev => [...newPosts, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Campaign generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmitForReview = async (postId: string) => {
    setBusyPostId(postId);
    setError(null);
    try {
      const updated = await updatePost(postId, 'submit');
      setPosts(prev => prev.map(p => (p.id === postId ? updated : p)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit the post.');
    } finally {
      setBusyPostId(null);
    }
  };

  const fullText = (post: ContentPost) =>
    resolveSiteLinks(post.hashtags?.length ? `${post.body}\n\n${post.hashtags.join(' ')}` : post.body);

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="admin-head border-b border-[var(--line)] pb-6">
        <p className="eyebrow">Outreach</p>
        <h1 className="mt-2 text-4xl sm:text-5xl text-[var(--snow)]">Content studio</h1>
        <p className="text-sm text-[var(--mist)] mt-3 max-w-3xl">
          Draft social posts, press releases and blog articles from any archived item. Every draft needs a second person's approval before it is published.
        </p>
      </div>

      {error && (
        <div role="alert" className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center space-x-3 text-rose-300 text-xs">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Asset Selector & Campaign Options Box */}
      <div className="glass-panel p-6 rounded-2xl space-y-6">
        <h3 className="micro-cap text-[var(--snow)]">1. Select Target Asset & Channels</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="select-research-asset-0" className="block text-xs font-semibold text-[var(--snow)]/80 mb-1">Select Research Asset *</label>
            <select
                id="select-research-asset-0"
              value={selectedAssetId}
              onChange={e => setSelectedAssetId(e.target.value)}
              className="w-full bg-[var(--navy-raised)] border border-[var(--line)] rounded-lg px-3 py-2 text-xs text-[var(--snow)] focus:outline-none focus:border-[var(--glacier)]"
            >
              {assets.length === 0 && <option value="">No AI-processed assets yet. Upload one first.</option>}
              {assets.map(ast => (
                <option key={ast.id} value={ast.id}>
                  {ast.title} ({ast.type}{ast.status === 'ready' ? ', not yet published' : ''})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="output-language-1" className="block text-xs font-semibold text-[var(--snow)]/80 mb-1">Output Language</label>
            <select
                id="output-language-1"
              value={language}
              onChange={e => setLanguage(e.target.value as keyof typeof LANGUAGE_OPTIONS)}
              className="w-full bg-[var(--navy-raised)] border border-[var(--line)] rounded-lg px-3 py-2 text-xs text-[var(--snow)] focus:outline-none focus:border-[var(--glacier)]"
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी (डिजिटल इंडिया राष्ट्रीय भाषा)</option>
              <option value="both">English + हिन्दी</option>
            </select>
          </div>
        </div>

        {/* Channels Checkboxes */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-[var(--snow)]/80">Target Dissemination Channels</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'x', label: 'X (Twitter)' },
              { id: 'instagram', label: 'Instagram Post' },
              { id: 'linkedin', label: 'LinkedIn Article' },
              { id: 'facebook', label: 'Facebook Page' },
              { id: 'press_release', label: 'Press release (draft)' },
              { id: 'blog', label: 'NCPOR News Blog' },
              { id: 'newsletter', label: 'Email Newsletter' }
            ].map(ch => (
              <button
                key={ch.id}
                type="button"
                onClick={() => handleChannelToggle(ch.id as SocialChannel)}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${selectedChannels.includes(ch.id as SocialChannel) ? 'bg-[var(--glacier)]/20 text-[var(--glacier)] border-[var(--glacier)]/40' : 'bg-[var(--navy-raised)]/60 text-[var(--mist)] border-[var(--line)]'}`}
              >
                <span>{ch.label}</span>
                <span className="text-[10px] font-mono">{selectedChannels.includes(ch.id as SocialChannel) ? '✓' : '+'}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Generate Campaign Button */}
        <button
          onClick={handleGenerateCampaign}
          disabled={generating || !selectedAssetId}
          className="w-full py-3.5 rounded-full btn-solid text-[var(--ink)] font-bold text-sm transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          <Sparkles className={`w-5 h-5 text-[var(--ink)] ${generating ? 'animate-spin' : ''}`} />
          <span>{generating ? 'AI Generating Multi-Channel Campaign...' : 'Generate 1-Click Multi-Channel Campaign'}</span>
        </button>
      </div>

      {/* Campaign Cards List */}
      <div className="space-y-6">
        <h3 className="text-base font-bold text-[var(--snow)] aurora-gradient-text">Generated Campaign Posts Queue</h3>

        {posts.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-2xl text-xs text-[var(--mist)]">
            No generated posts yet. Pick an asset above and click Generate Campaign.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {posts.map(post => (
              <div key={post.id} className="glass-panel rounded-md p-5 space-y-4 flex flex-col justify-between border-[var(--line)] hover:border-[var(--glacier)]/30 transition-all">
                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="micro-cap text-[var(--glacier)]">
                        {post.channel.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--mist)] uppercase">{post.language}</span>
                      {post.channel === 'x' && (
                        <span className="text-[10px] font-mono text-[var(--mist)]">{fullText(post).length}/280</span>
                      )}
                    </span>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${post.status === 'approved' || post.status === 'scheduled' ? 'bg-emerald-400/10 text-emerald-300 border border-emerald-500/30' : post.status === 'published' ? 'bg-[var(--glacier)]/10 text-[var(--glacier)] border border-[var(--glacier)]/30' : post.status === 'rejected' ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30' : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'}`}>
                      {post.status}
                    </span>
                  </div>

                  {/* Channel-Specific Preview Box */}
                  <div className="p-4 rounded-xl bg-[var(--ink)] border border-[var(--line)] space-y-3 font-sans">
                    <div className="flex items-center space-x-2 border-b border-[var(--line)] pb-2">
                      <div className="w-6 h-6 rounded-full bg-[var(--glacier)]/20 text-[var(--glacier)] font-bold text-[10px] flex items-center justify-center">
                        N
                      </div>
                      <span className="text-xs font-bold text-[var(--snow)]">Channel preview</span>
                    </div>

                    <p className="text-xs text-[var(--snow)] whitespace-pre-wrap leading-relaxed" lang={post.language}>
                      {resolveSiteLinks(post.body)}
                    </p>
                    {post.hashtags?.length > 0 && (
                      <p className="text-xs text-[var(--glacier)]">{post.hashtags.join(' ')}</p>
                    )}
                    {post.status === 'rejected' && post.review_note && (
                      <p className="text-[11px] text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-md p-2">
                        Reviewer: {post.review_note}
                      </p>
                    )}

                    {VERIFIABLE_STATUSES.includes(post.status) && <PostQR post={post} sourceTitle={post.asset?.title} />}

                    {post.image_url && (
                      <div className="rounded-lg overflow-hidden max-h-48 bg-[var(--navy-raised)]">
                        <img src={post.image_url} alt="Share Card" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-2 flex items-center justify-between border-t border-[var(--line)] text-xs">
                  <button
                    onClick={() => handleCopyText(post.id, fullText(post))}
                    className="px-3 py-1.5 rounded-lg bg-[var(--navy-raised)] border border-[var(--line)] text-[var(--glacier)] hover:border-[var(--glacier)] flex items-center space-x-1.5"
                  >
                    {copiedId === post.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === post.id ? 'Copied' : 'Copy Text'}</span>
                  </button>

                  {post.status === 'draft' || post.status === 'rejected' ? (
                    <button
                      onClick={() => handleSubmitForReview(post.id)}
                      disabled={busyPostId === post.id}
                      className="px-3 py-1.5 rounded-lg bg-[var(--glacier)]/10 text-[var(--glacier)] border border-[var(--glacier)]/30 hover:bg-[var(--glacier)]/20 flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{busyPostId === post.id ? 'Submitting...' : 'Submit for Review'}</span>
                    </button>
                  ) : post.status === 'in_review' ? (
                    <a href="/admin/review" className="px-3 py-1.5 rounded-lg text-[var(--mist)] hover:text-[var(--glacier)]">
                      In review queue →
                    </a>
                  ) : (
                    <span className="px-3 py-1.5 text-emerald-300">Approved · QR card ready</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
