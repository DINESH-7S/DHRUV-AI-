"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, Sparkles, Plus, CheckCircle, AlertCircle, Eye, Globe, ExternalLink } from 'lucide-react';
import { fetchStaffAssets, type StaffAsset } from '@/lib/db/staff-client';

interface GeneratedLesson {
  id: string;
  asset_id: string;
  title: string;
  grade_band: string;
  language: string;
  content_md: string;
  learning_objectives: string[];
  status?: string;
}

export default function AdminLessonsPage() {
  const [assets, setAssets] = useState<StaffAsset[]>([]);
  const [existingLessons, setExistingLessons] = useState<GeneratedLesson[]>([]);

  // Form State
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [gradeBand, setGradeBand] = useState<'6-8' | '9-10' | '11-12'>('9-10');
  const [language, setLanguage] = useState<'en' | 'hi'>('en');

  const [generating, setGenerating] = useState(false);
  const [activeLesson, setActiveLesson] = useState<GeneratedLesson | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyPublishId, setBusyPublishId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [astData, lessonRes] = await Promise.all([
          fetchStaffAssets(['ready', 'published']),
          fetch('/api/education/lessons?all=1')
        ]);
        setAssets(astData);
        if (astData.length > 0) setSelectedAssetId(astData[0].id);

        if (lessonRes.ok) {
          const lData = await lessonRes.json();
          setExistingLessons(Array.isArray(lData) ? lData : []);
        }
      } catch (err: any) {
        setError(err.message || 'Could not load staff data.');
      }
    }
    loadData();
  }, []);

  const handleGenerateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId) return;

    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/education/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: selectedAssetId,
          gradeBand,
          language
        })
      });

      if (res.ok) {
        const data = await res.json();
        setActiveLesson(data.lesson);
        setActiveQuiz(data.quiz);
        setExistingLessons(prev => [data.lesson, ...prev]);
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to generate lesson.');
      }
    } catch (err: any) {
      setError(err.message || 'Error generating lesson.');
    } finally {
      setGenerating(false);
    }
  };

  const handlePublishLesson = async (lessonId: string, action: 'publish' | 'unpublish') => {
    setBusyPublishId(lessonId);
    try {
      const res = await fetch(`/api/education/lessons/${lessonId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Could not ${action} the lesson.`);
      setError(null);
      setExistingLessons(prev => prev.map(l => l.id === lessonId ? { ...l, status: body.status } : l));
      if (activeLesson?.id === lessonId) {
        setActiveLesson(prev => prev ? { ...prev, status: body.status } : null);
      }
    } catch (err: any) {
      setError(err.message || 'Action failed.');
    } finally {
      setBusyPublishId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="admin-head border-b border-[var(--line)] pb-6">
        <p className="eyebrow">Outreach</p>
        <h1 className="mt-2 text-4xl sm:text-5xl text-[var(--snow)]">Lessons</h1>
        <p className="text-sm text-[var(--mist)] mt-3 max-w-3xl">
          Transform scientific research reports into school lessons and multiple-choice quizzes for Class 6 to 12.
        </p>
      </div>

      {error && (
        <div role="alert" className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center space-x-2 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Generator Form */}
      <form onSubmit={handleGenerateLesson} className="glass-panel p-6 rounded-2xl space-y-6">
        <h3 className="micro-cap text-[var(--snow)]">Generate New School Module</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="select-source-asset-0" className="block text-xs font-semibold text-[var(--snow)]/80 mb-1">Select Source Asset *</label>
            <select
                id="select-source-asset-0"
              value={selectedAssetId}
              onChange={e => setSelectedAssetId(e.target.value)}
              className="w-full bg-[var(--navy-raised)] border border-[var(--line)] rounded-lg px-3 py-2 text-xs text-[var(--snow)] focus:outline-none focus:border-amber-400"
            >
              {assets.map(ast => (
                <option key={ast.id} value={ast.id}>{ast.title} ({ast.type})</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="target-grade-band-1" className="block text-xs font-semibold text-[var(--snow)]/80 mb-1">Target Grade Band *</label>
            <select
                id="target-grade-band-1"
              value={gradeBand}
              onChange={e => setGradeBand(e.target.value as any)}
              className="w-full bg-[var(--navy-raised)] border border-[var(--line)] rounded-lg px-3 py-2 text-xs text-[var(--snow)] focus:outline-none focus:border-amber-400"
            >
              <option value="6-8">Class 6 - 8 (Middle School)</option>
              <option value="9-10">Class 9 - 10 (Secondary)</option>
              <option value="11-12">Class 11 - 12 (Higher Secondary)</option>
            </select>
          </div>

          <div>
            <label htmlFor="language-2" className="block text-xs font-semibold text-[var(--snow)]/80 mb-1">Language</label>
            <select
                id="language-2"
              value={language}
              onChange={e => setLanguage(e.target.value as any)}
              className="w-full bg-[var(--navy-raised)] border border-[var(--line)] rounded-lg px-3 py-2 text-xs text-[var(--snow)] focus:outline-none focus:border-amber-400"
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={generating || !selectedAssetId}
          className="w-full py-3.5 rounded-full btn-solid text-[var(--ink)] font-bold text-xs transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          <Sparkles className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
          <span>{generating ? 'AI Generating Lesson & Quiz Questions...' : 'Generate School Lesson & Quiz'}</span>
        </button>
      </form>

      {/* Generated Lesson Preview */}
      {activeLesson && (
        <div className="glass-panel p-6 rounded-2xl space-y-6 border border-amber-500/40">
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
            <div>
              <span className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] uppercase font-bold">
                Grade {activeLesson.grade_band} • {activeLesson.language}
              </span>
              <h3 className="text-lg font-bold text-[var(--snow)] aurora-gradient-text mt-1">{activeLesson.title}</h3>
            </div>

            <button
              onClick={() => handlePublishLesson(activeLesson.id, activeLesson.status === 'published' ? 'unpublish' : 'publish')}
              disabled={busyPublishId === activeLesson.id}
              className="px-4 py-2 rounded-xl bg-emerald-400/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold hover:bg-emerald-400/30 flex items-center space-x-1.5"
            >
              <Globe className="w-4 h-4" />
              <span>{activeLesson.status === 'published' ? 'Unpublish' : 'Publish Lesson to Public /learn'}</span>
            </button>
          </div>

          <div className="p-4 bg-[var(--ink)] rounded-xl text-xs text-[var(--snow)] whitespace-pre-wrap font-mono max-h-80 overflow-y-auto">
            {activeLesson.content_md}
          </div>
        </div>
      )}

      {/* Existing Lessons List */}
      <div className="space-y-4">
        <h3 className="micro-cap text-[var(--snow)]">Educational Modules List ({existingLessons.length})</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {existingLessons.map(l => (
            <div key={l.id} className="glass-panel p-5 rounded-2xl space-y-3 border border-[var(--line)] flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] uppercase font-bold">
                    Grade {l.grade_band}
                  </span>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${l.status === 'published' ? 'bg-emerald-400/10 text-emerald-300 border border-emerald-500/30' : 'bg-white/5 text-[var(--mist)] border border-[var(--line)]'}`}>
                    {l.status || 'draft'}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-[var(--snow)] line-clamp-2">{l.title}</h4>
              </div>

              <div className="pt-2 border-t border-[var(--line)] flex items-center justify-between text-xs">
                <Link href={`/learn/${l.id}`} className="text-[var(--glacier)] hover:underline flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> Preview Lesson
                </Link>
                <button
                  onClick={() => handlePublishLesson(l.id, l.status === 'published' ? 'unpublish' : 'publish')}
                  disabled={busyPublishId === l.id}
                  className="text-xs font-semibold text-emerald-300 hover:underline"
                >
                  {l.status === 'published' ? 'Unpublish' : 'Publish'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
