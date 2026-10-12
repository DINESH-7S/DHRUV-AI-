"use client";

import React, { useEffect, useState } from 'react';
import { UploadCloud, CheckCircle, AlertCircle, Sparkles, Loader2, RotateCcw } from 'lucide-react';
import { fetchExpeditions, fetchStations } from '@/lib/db/supabase';
import {
  startIngestion,
  uploadAndIngest,
  waitForIngestion,
  type IngestJobStatus,
  type UploadMetadata,
  type UploadStage,
} from '@/lib/db/upload-client';
import type { Expedition, Station } from '@/lib/types/database';
import { ARCHIVE_EXTENSIONS, LICENSES } from '@/lib/db/buckets';

const STAGE_LABELS: Record<UploadStage, string> = {
  preparing: 'Creating asset record...',
  uploading: 'Uploading file to secure storage...',
  starting_ai: 'Starting AI processing...',
};

const splitList = (value: string) => value.split(',').map(v => v.trim()).filter(Boolean);

export default function AdminUploadPage() {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [stage, setStage] = useState<UploadStage | null>(null);
  const [job, setJob] = useState<IngestJobStatus | null>(null);
  const [lastAssetId, setLastAssetId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [stations, setStations] = useState<Station[]>([]);
  const [expeditions, setExpeditions] = useState<Expedition[]>([]);

  // Form Metadata
  const [title, setTitle] = useState('');
  const [titleHi, setTitleHi] = useState('');
  const [assetType, setAssetType] = useState<UploadMetadata['type']>('report');
  const [region, setRegion] = useState<UploadMetadata['region']>('antarctic');
  const [stationId, setStationId] = useState('');
  const [expeditionId, setExpeditionId] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [discipline, setDiscipline] = useState('');
  const [authors, setAuthors] = useState('');
  const [accessLevel, setAccessLevel] = useState<'public' | 'restricted'>('public');
  const [description, setDescription] = useState('');
  const [license, setLicense] = useState<UploadMetadata['license'] | ''>('');

  useEffect(() => {
    fetchStations().then(setStations).catch(() => setErrorMessage('Could not load stations.'));
    fetchExpeditions().then(setExpeditions).catch(() => setErrorMessage('Could not load expeditions.'));
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Please select a file to upload.');
      return;
    }
    if (!license) {
      setErrorMessage('Choose the licence this item is published under.');
      return;
    }

    setUploading(true);
    setErrorMessage(null);
    setJob(null);

    try {
      // Browser -> Supabase Storage directly (signed URL), then AI ingestion runs in the background.
      const { assetId, jobId } = await uploadAndIngest(
        selectedFile,
        {
          type: assetType,
          title,
          titleHi: titleHi || undefined,
          description,
          region,
          year,
          stationId: stationId || undefined,
          expeditionId: expeditionId || undefined,
          disciplines: splitList(discipline),
          authors: splitList(authors),
          accessLevel,
          license,
        },
        setStage,
      );
      setLastAssetId(assetId);
      setSelectedFile(null);
      setStage(null);
      await waitForIngestion(jobId, setJob);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'An error occurred during upload.');
    } finally {
      setUploading(false);
      setStage(null);
    }
  };

  const handleRetry = async () => {
    if (!lastAssetId) return;
    setUploading(true);
    setErrorMessage(null);
    try {
      const { jobId } = await startIngestion(lastAssetId);
      await waitForIngestion(jobId, setJob);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Retry failed.');
    } finally {
      setUploading(false);
    }
  };

  const aiRunning = job?.status === 'pending' || job?.status === 'processing';

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="admin-head border-b border-[var(--line)] pb-6">
        <p className="eyebrow">Archive</p>
        <h1 className="mt-2 text-4xl sm:text-5xl text-[var(--snow)]">Upload & AI cataloguing</h1>
        <p className="text-sm text-[var(--mist)] mt-3 max-w-3xl">
          Upload raw scientific reports, datasets, and media. Files are stored directly in Supabase Storage and queued for AI metadata extraction.
        </p>
      </div>

      {stage && (
        <div className="p-4 rounded-xl bg-[var(--glacier)]/10 border border-[var(--glacier)]/30 flex items-center space-x-3 text-[var(--glacier)] text-xs">
          <Loader2 className="w-5 h-5 text-[var(--glacier)] flex-shrink-0 animate-spin" />
          <span>{STAGE_LABELS[stage]}</span>
        </div>
      )}

      {aiRunning && (
        <div className="p-4 rounded-xl bg-[var(--glacier)]/10 border border-[var(--glacier)]/30 flex items-center space-x-3 text-[var(--glacier)] text-xs">
          <Sparkles className="w-5 h-5 text-[var(--glacier)] flex-shrink-0 animate-pulse" />
          <div>
            <p className="font-bold">File uploaded. AI is reading it now...</p>
            <p className="text-[var(--glacier)]/80">Extracting text, writing summaries (English + हिन्दी), tagging and indexing for search. Usually 20-90 seconds.</p>
          </div>
        </div>
      )}

      {job?.status === 'completed' && (
        <div className="p-4 rounded-xl bg-emerald-400/10 border border-emerald-500/30 flex items-center space-x-3 text-emerald-300 text-xs">
          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div>
            <p className="font-bold">AI processing complete. Ready for review.</p>
            <p className="text-emerald-400/80">
              Summaries, Hindi translation and tags were generated. Nothing is public until a reviewer publishes it.{' '}
              <a href={`/asset/${job.assetId}`} className="underline font-semibold">Open asset</a>
            </p>
          </div>
        </div>
      )}

      {job?.status === 'failed' && (
        <div role="alert" className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-3 text-rose-300 text-xs">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <div>
              <p className="font-bold">The file was saved, but AI processing failed.</p>
              <p className="text-rose-300/80">{job.error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-400/40 hover:bg-rose-500/20 font-semibold disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {errorMessage && (
        <div role="alert" className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center space-x-3 text-rose-300 text-xs">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Drag and Drop Zone */}
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`p-8 rounded-2xl border-2 border-dashed text-center transition-all cursor-pointer ${dragActive ? 'border-[var(--glacier)] bg-[var(--glacier)]/10' : 'border-[var(--line)] bg-[var(--navy-raised)]/40 hover:border-[var(--line)]'}`}
        >
          <input
            type="file"
            id="file-upload"
            accept={ARCHIVE_EXTENSIONS.map(ext => `.${ext}`).join(',')}
            className="sr-only"
            onChange={handleFileChange}
          />
          <label htmlFor="file-upload" className="cursor-pointer space-y-3 block">
            <UploadCloud className="w-10 h-10 text-[var(--glacier)] mx-auto" aria-hidden />
            <div>
              <p className="text-sm font-bold text-[var(--snow)]">
                {selectedFile ? selectedFile.name : 'Drag and drop your file here, or click to browse'}
              </p>
              <p className="text-xs text-[var(--mist)] mt-1">
                PDF, CSV, NetCDF, Excel, JPG, PNG, TIFF, MP4, WebM (up to 50 MB)
              </p>
            </div>
          </label>
        </div>

        {/* Metadata Form */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <h3 className="micro-cap text-[var(--snow)]">Asset Metadata</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="title-en" className="block text-xs font-semibold text-[var(--snow)]/80 mb-1">Asset Title (English) *</label>
              <input
                id="title-en"
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. 43rd Antarctic Expedition Glaciology Survey"
                className="w-full bg-[var(--navy-raised)] border border-[var(--line)] rounded-lg px-3 py-2 text-xs text-[var(--snow)] focus:outline-none focus:border-[var(--glacier)]"
              />
            </div>

            <div>
              <label htmlFor="title-hi" className="block text-xs font-semibold text-[var(--snow)]/80 mb-1">Asset Title (Hindi)</label>
              <input
                id="title-hi"
                type="text"
                value={titleHi}
                onChange={e => setTitleHi(e.target.value)}
                placeholder="उदा. 43वां अंटार्कटिक अभियान सर्वेक्षण"
                className="w-full bg-[var(--navy-raised)] border border-[var(--line)] rounded-lg px-3 py-2 text-xs text-[var(--snow)] focus:outline-none focus:border-[var(--glacier)] font-sans"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="asset-type" className="block text-xs font-semibold text-[var(--snow)]/80 mb-1">Asset Type</label>
              <select
                id="asset-type"
                value={assetType}
                onChange={e => setAssetType(e.target.value as UploadMetadata['type'])}
                className="w-full bg-[var(--navy-raised)] border border-[var(--line)] rounded-lg px-3 py-2 text-xs text-[var(--snow)] focus:outline-none focus:border-[var(--glacier)]"
              >
                <option value="report">Report (PDF)</option>
                <option value="publication">Publication</option>
                <option value="dataset">Dataset (CSV/NetCDF)</option>
                <option value="photo">Photograph</option>
                <option value="video">Video</option>
              </select>
            </div>

            <div>
              <label htmlFor="region" className="block text-xs font-semibold text-[var(--snow)]/80 mb-1">Polar Region</label>
              <select
                id="region"
                value={region}
                onChange={e => setRegion(e.target.value as UploadMetadata['region'])}
                className="w-full bg-[var(--navy-raised)] border border-[var(--line)] rounded-lg px-3 py-2 text-xs text-[var(--snow)] focus:outline-none focus:border-[var(--glacier)]"
              >
                <option value="antarctic">Antarctica</option>
                <option value="arctic">Arctic</option>
                <option value="himalaya">Himalayas</option>
                <option value="southern_ocean">Southern Ocean</option>
              </select>
            </div>

            <div>
              <label htmlFor="station" className="block text-xs font-semibold text-[var(--snow)]/80 mb-1">Station</label>
              <select
                id="station"
                value={stationId}
                onChange={e => setStationId(e.target.value)}
                className="w-full bg-[var(--navy-raised)] border border-[var(--line)] rounded-lg px-3 py-2 text-xs text-[var(--snow)] focus:outline-none focus:border-[var(--glacier)]"
              >
                <option value="">None / not station-specific</option>
                {stations.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="access" className="block text-xs font-semibold text-[var(--snow)]/80 mb-1">Access Level</label>
              <select
                id="access"
                value={accessLevel}
                onChange={e => setAccessLevel(e.target.value as 'public' | 'restricted')}
                className="w-full bg-[var(--navy-raised)] border border-[var(--line)] rounded-lg px-3 py-2 text-xs text-[var(--snow)] focus:outline-none focus:border-[var(--glacier)]"
              >
                <option value="public">Public Access</option>
                <option value="restricted">Restricted Access</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_8rem] gap-4">
            <div>
              <label htmlFor="expedition" className="block text-xs font-semibold text-[var(--snow)]/80 mb-1">Expedition</label>
              <select
                id="expedition"
                value={expeditionId}
                onChange={e => setExpeditionId(e.target.value)}
                className="w-full bg-[var(--navy-raised)] border border-[var(--line)] rounded-lg px-3 py-2 text-xs text-[var(--snow)] focus:outline-none focus:border-[var(--glacier)]"
              >
                <option value="">None / not expedition-specific</option>
                {expeditions.map(x => (
                  <option key={x.id} value={x.id}>{x.code} - {x.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="year" className="block text-xs font-semibold text-[var(--snow)]/80 mb-1">Year *</label>
              <input
                id="year"
                type="number"
                required
                min={1981}
                max={2100}
                value={year}
                onChange={e => setYear(Number(e.target.value))}
                className="w-full bg-[var(--navy-raised)] border border-[var(--line)] rounded-lg px-3 py-2 text-xs text-[var(--snow)] focus:outline-none focus:border-[var(--glacier)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="authors" className="block text-xs font-semibold text-[var(--snow)]/80 mb-1">Authors (Comma separated)</label>
              <input
                id="authors"
                type="text"
                value={authors}
                onChange={e => setAuthors(e.target.value)}
                placeholder="e.g. A. Sharma, R. Iyer"
                className="w-full bg-[var(--navy-raised)] border border-[var(--line)] rounded-lg px-3 py-2 text-xs text-[var(--snow)] focus:outline-none focus:border-[var(--glacier)]"
              />
            </div>

            <div>
              <label htmlFor="disciplines" className="block text-xs font-semibold text-[var(--snow)]/80 mb-1">Disciplines</label>
              <input
                id="disciplines"
                type="text"
                value={discipline}
                onChange={e => setDiscipline(e.target.value)}
                placeholder="e.g. Glaciology, Climate Science (AI adds more)"
                className="w-full bg-[var(--navy-raised)] border border-[var(--line)] rounded-lg px-3 py-2 text-xs text-[var(--snow)] focus:outline-none focus:border-[var(--glacier)]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-xs font-semibold text-[var(--snow)]/80 mb-1">Description / Abstract</label>
            <textarea
                id="description"
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Provide a brief scientific summary or abstract..."
              className="w-full bg-[var(--navy-raised)] border border-[var(--line)] rounded-lg px-3 py-2 text-xs text-[var(--snow)] focus:outline-none focus:border-[var(--glacier)]"
            />
          </div>

          <div>
            <label htmlFor="license" className="block text-xs font-semibold text-[var(--snow)]/80 mb-1">Licence *</label>
            <select
              id="license"
              required
              value={license}
              onChange={e => setLicense(e.target.value as UploadMetadata['license'])}
              className="w-full bg-[var(--navy-raised)] border border-[var(--line)] rounded-lg px-3 py-2 text-xs text-[var(--snow)] focus:outline-none focus:border-[var(--glacier)]"
            >
              <option value="" disabled>Choose the licence (required: never assume an open licence)</option>
              {LICENSES.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-[var(--mist)]">Credit third-party material in the description: source link and rights holder.</p>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={uploading}
          className="w-full py-3.5 rounded-full btn-solid text-[var(--ink)] font-bold text-sm transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          <UploadCloud className="w-5 h-5" />
          <span>{uploading ? (stage ? STAGE_LABELS[stage] : 'AI processing...') : 'Upload & Trigger Ingestion'}</span>
        </button>
      </form>
    </div>
  );
}
