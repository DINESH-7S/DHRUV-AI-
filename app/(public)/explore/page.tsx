"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Search, Grid, List, Compass, Download, Eye, FileText, Database, Image as ImageIcon, Video, ChevronDown, X, RotateCcw, ArrowUpRight } from 'lucide-react';
import { Asset, AssetType } from '@/lib/types/database';
// Data comes from /api/explore (server), so no database client ships to the browser.
import { smallThumbnail } from '@/lib/utils';
import { Reveal, Stagger, StaggerItem } from '@/components/motion/Reveal';

/** Results rendered per "Show more" step. */
const PAGE_SIZE = 24;

// In-memory session cache for instant filter responses and tab returns
let cachedFacets: { stations: any[]; expeditions: any[] } | null = null;
const exploreQueryCache = new Map<string, Asset[]>();
let masterAllAssets: Asset[] | null = null;

function ExploreContent() {
  const t = useTranslations('explore');
  const tTypes = useTranslations('types');
  const tRegions = useTranslations('regions');
  const hi = useLocale() === 'hi';
  const searchParams = useSearchParams();
  const initialQuery = searchParams ? (searchParams.get('q') || '') : '';

  const initialParams = new URLSearchParams({
    search: initialQuery,
    type: 'all',
    region: 'all',
    station_id: searchParams?.get('station_id') || 'all',
    expedition_id: searchParams?.get('expedition_id') || 'all',
  });
  const initialCacheKey = initialParams.toString();
  const cachedInitial = exploreQueryCache.get(initialCacheKey);

  const [assets, setAssets] = useState<Asset[]>(() => cachedInitial ?? []);
  // Render a page of results at a time: all 80+ cards at once made a 38,000 px phone page.
  const [shown, setShown] = useState(PAGE_SIZE);
  useEffect(() => setShown(PAGE_SIZE), [assets]);
  const visible = assets.slice(0, shown);
  const [loading, setLoading] = useState(() => !cachedInitial && !masterAllAssets);
  const [search, setSearch] = useState(initialQuery);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedStation, setSelectedStation] = useState<string>(searchParams?.get('station_id') || 'all');
  const [selectedExpedition, setSelectedExpedition] = useState<string>(searchParams?.get('expedition_id') || 'all');
  const [loadError, setLoadError] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [stations, setStations] = useState<any[]>(() => cachedFacets?.stations ?? []);
  const [expeditions, setExpeditions] = useState<any[]>(() => cachedFacets?.expeditions ?? []);
  const [isPending, startTransition] = React.useTransition();

  useEffect(() => {
    const q = searchParams ? (searchParams.get('q') || '') : '';
    if (q) setSearch(q);
  }, [searchParams]);

  useEffect(() => {
    if (cachedFacets) return;
    let active = true;
    fetch('/api/explore?facets=1')
      .then(r => (r.ok ? r.json() : Promise.reject(r)))
      .then(data => {
        if (!active) return;
        cachedFacets = data;
        setStations(data.stations);
        setExpeditions(data.expeditions);
      })
      .catch(() => { if (active) setLoadError(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let stale = false;
    const params = new URLSearchParams({
      search,
      type: selectedType,
      region: selectedRegion,
      station_id: selectedStation,
      expedition_id: selectedExpedition,
    });
    const cacheKey = params.toString();

    // 1. Instant cache hit
    if (exploreQueryCache.has(cacheKey)) {
      setAssets(exploreQueryCache.get(cacheKey)!);
      setLoadError(false);
      setLoading(false);
      return;
    }

    // 2. Instant in-memory filter if master list exists and text search is empty
    if (
      !search.trim() &&
      selectedStation === 'all' &&
      selectedExpedition === 'all' &&
      masterAllAssets
    ) {
      const filtered = masterAllAssets.filter(
        (a) =>
          (selectedType === 'all' || a.type === selectedType) &&
          (selectedRegion === 'all' || a.region === selectedRegion)
      );
      exploreQueryCache.set(cacheKey, filtered);
      setAssets(filtered);
      setLoadError(false);
      setLoading(false);
      return;
    }

    const delay = search ? 150 : 0;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/explore?${params}`);
        if (!res.ok) throw new Error('search failed');
        const astData: Asset[] = (await res.json()).assets;
        if (stale) return;

        if (
          !search.trim() &&
          selectedType === 'all' &&
          selectedRegion === 'all' &&
          selectedStation === 'all' &&
          selectedExpedition === 'all'
        ) {
          masterAllAssets = astData;
        }

        exploreQueryCache.set(cacheKey, astData);
        startTransition(() => {
          setAssets(astData);
          setLoadError(false);
          setLoading(false);
        });
      } catch {
        if (stale) return;
        startTransition(() => {
          setAssets([]);
          setLoadError(true);
          setLoading(false);
        });
      }
    }, delay);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [search, selectedType, selectedRegion, selectedStation, selectedExpedition]);

  const getTypeIcon = (type: AssetType) => {
    switch (type) {
      case 'report':
      case 'publication': return <FileText className="w-3.5 h-3.5 text-[var(--glacier)]" aria-hidden="true" />;
      case 'dataset': return <Database className="w-3.5 h-3.5 text-[var(--glacier)]" aria-hidden="true" />;
      case 'photo': return <ImageIcon className="w-3.5 h-3.5 text-[var(--glacier)]" aria-hidden="true" />;
      case 'video': return <Video className="w-3.5 h-3.5 text-[var(--glacier)]" aria-hidden="true" />;
      default: return <Compass className="w-3.5 h-3.5 text-[var(--glacier)]" aria-hidden="true" />;
    }
  };

  const activeFilterCount = (search ? 1 : 0) + (selectedType !== 'all' ? 1 : 0) + (selectedRegion !== 'all' ? 1 : 0) + (selectedStation !== 'all' ? 1 : 0) + (selectedExpedition !== 'all' ? 1 : 0);

  const handleReset = () => {
    setSearch('');
    setSelectedType('all');
    setSelectedRegion('all');
    setSelectedStation('all');
    setSelectedExpedition('all');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-24 space-y-10">
      {/* Search & faceted filter bar, lifted over the page band */}
      <div className="relative bg-[var(--navy-raised)] p-5 rounded-md border border-[var(--line)] space-y-4 shadow-[0_30px_60px_-30px_rgba(1,6,12,0.9)]">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--mist)]" aria-hidden="true" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              aria-label={t('searchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-[var(--ink)] border border-[var(--line)] rounded-xl text-xs text-[var(--snow)] placeholder-[var(--mist)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--glacier)]/50 focus-visible:border-[var(--glacier)] transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                aria-label="Clear search query"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-[var(--line)] text-[var(--mist)] hover:text-[var(--snow)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--glacier)] transition-colors"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* View Switcher */}
          <div className="flex items-center space-x-1 bg-[var(--ink)] p-1 border border-[var(--line)] rounded-xl self-start" role="radiogroup" aria-label="View mode">
            <button
              onClick={() => setViewMode('grid')}
              role="radio"
              aria-checked={viewMode === 'grid'}
              aria-label={t('grid')}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--glacier)] ${viewMode === 'grid' ? 'bg-[var(--glacier)]/20 text-[var(--glacier)] border border-[var(--glacier)]/40 shadow-sm' : 'text-[var(--mist)] hover:text-[var(--snow)]'}`}
            >
              <Grid className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              role="radio"
              aria-checked={viewMode === 'list'}
              aria-label={t('list')}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--glacier)] ${viewMode === 'list' ? 'bg-[var(--glacier)]/20 text-[var(--glacier)] border border-[var(--glacier)]/40 shadow-sm' : 'text-[var(--mist)] hover:text-[var(--snow)]'}`}
            >
              <List className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Quick Type Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--mist)] mr-1 shrink-0">{t('quickFilter')}</span>
          {(['all', 'dataset', 'report', 'publication', 'photo', 'video', 'event'] as const).map(type => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--glacier)] ${
                selectedType === type
                  ? 'bg-[var(--glacier)] text-[#06121e] font-semibold shadow-sm'
                  : 'bg-[var(--ink)] text-[var(--mist)] hover:text-[var(--snow)] border border-[var(--line)] hover:border-[var(--glacier)]/40'
              }`}
            >
              {type === 'all' ? t('allTypes') : tTypes(type)}
            </button>
          ))}
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-3 border-t border-[var(--line)]">
          <div>
            <label htmlFor="filter-type" className="block text-[10px] font-bold uppercase tracking-wider text-[var(--mist)] mb-1.5">{t('type')}</label>
            <div className="relative group">
              <select
                id="filter-type"
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
                className="w-full appearance-none bg-[var(--ink)] border border-[var(--line)] rounded-xl px-3 py-2 pr-8 text-xs text-[var(--snow)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--glacier)]/50 focus-visible:border-[var(--glacier)] cursor-pointer transition-colors"
              >
                <option value="all">{t('allTypes')}</option>
                {(['report', 'publication', 'dataset', 'photo', 'video', 'event'] as const).map(type => (
                  <option key={type} value={type}>{tTypes(type)}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--mist)] group-hover:text-[var(--snow)] transition-colors" aria-hidden="true" />
            </div>
          </div>

          <div>
            <label htmlFor="filter-region" className="block text-[10px] font-bold uppercase tracking-wider text-[var(--mist)] mb-1.5">{t('region')}</label>
            <div className="relative group">
              <select
                id="filter-region"
                value={selectedRegion}
                onChange={e => setSelectedRegion(e.target.value)}
                className="w-full appearance-none bg-[var(--ink)] border border-[var(--line)] rounded-xl px-3 py-2 pr-8 text-xs text-[var(--snow)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--glacier)]/50 focus-visible:border-[var(--glacier)] cursor-pointer transition-colors"
              >
                <option value="all">{t('allRegions')}</option>
                {(['antarctic', 'arctic', 'himalaya', 'southern_ocean'] as const).map(region => (
                  <option key={region} value={region}>{tRegions(region)}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--mist)] group-hover:text-[var(--snow)] transition-colors" aria-hidden="true" />
            </div>
          </div>

          <div>
            <label htmlFor="filter-station" className="block text-[10px] font-bold uppercase tracking-wider text-[var(--mist)] mb-1.5">{t('station')}</label>
            <div className="relative group">
              <select
                id="filter-station"
                value={selectedStation}
                onChange={e => setSelectedStation(e.target.value)}
                className="w-full appearance-none bg-[var(--ink)] border border-[var(--line)] rounded-xl px-3 py-2 pr-8 text-xs text-[var(--snow)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--glacier)]/50 focus-visible:border-[var(--glacier)] cursor-pointer transition-colors"
              >
                <option value="all">{t('allStations')}</option>
                {stations.map(st => (
                  <option key={st.id} value={st.id}>{hi && st.name_hi ? st.name_hi : st.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--mist)] group-hover:text-[var(--snow)] transition-colors" aria-hidden="true" />
            </div>
          </div>

          <div>
            <label htmlFor="filter-expedition" className="block text-[10px] font-bold uppercase tracking-wider text-[var(--mist)] mb-1.5">{t('expedition')}</label>
            <div className="relative group">
              <select
                id="filter-expedition"
                value={selectedExpedition}
                onChange={e => setSelectedExpedition(e.target.value)}
                className="w-full appearance-none bg-[var(--ink)] border border-[var(--line)] rounded-xl px-3 py-2 pr-8 text-xs text-[var(--snow)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--glacier)]/50 focus-visible:border-[var(--glacier)] cursor-pointer transition-colors"
              >
                <option value="all">{t('allExpeditions')}</option>
                {expeditions.map(ex => (
                  <option key={ex.id} value={ex.id}>{hi && ex.name_hi ? ex.name_hi : ex.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--mist)] group-hover:text-[var(--snow)] transition-colors" aria-hidden="true" />
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleReset}
              disabled={activeFilterCount === 0}
              className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--glacier)] ${
                activeFilterCount > 0
                  ? 'bg-[var(--glacier)]/10 text-[var(--glacier)] border-[var(--glacier)]/40 hover:bg-[var(--glacier)]/20 cursor-pointer shadow-sm'
                  : 'bg-[var(--ink)]/50 text-[var(--mist)]/40 border-[var(--line)] cursor-not-allowed opacity-50'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t('reset')}</span>
              {activeFilterCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[var(--glacier)] text-[#06121e] text-[10px] font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Active Filter Tags */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--line)] text-xs">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--mist)]">Active filters:</span>
            {search && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--ink)] border border-[var(--glacier)]/40 text-[var(--glacier)] text-[11px]">
                <span>Query: "{search}"</span>
                <button onClick={() => setSearch('')} aria-label="Remove search filter" className="hover:text-[var(--snow)]"><X className="w-3 h-3" /></button>
              </span>
            )}
            {selectedType !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--ink)] border border-[var(--glacier)]/40 text-[var(--glacier)] text-[11px]">
                <span>Type: {tTypes(selectedType)}</span>
                <button onClick={() => setSelectedType('all')} aria-label="Remove type filter" className="hover:text-[var(--snow)]"><X className="w-3 h-3" /></button>
              </span>
            )}
            {selectedRegion !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--ink)] border border-[var(--glacier)]/40 text-[var(--glacier)] text-[11px]">
                <span>Region: {tRegions(selectedRegion)}</span>
                <button onClick={() => setSelectedRegion('all')} aria-label="Remove region filter" className="hover:text-[var(--snow)]"><X className="w-3 h-3" /></button>
              </span>
            )}
            {selectedStation !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--ink)] border border-[var(--glacier)]/40 text-[var(--glacier)] text-[11px]">
                <span>Station: {stations.find(s => s.id === selectedStation)?.name || selectedStation}</span>
                <button onClick={() => setSelectedStation('all')} aria-label="Remove station filter" className="hover:text-[var(--snow)]"><X className="w-3 h-3" /></button>
              </span>
            )}
            {selectedExpedition !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--ink)] border border-[var(--glacier)]/40 text-[var(--glacier)] text-[11px]">
                <span>{t('expedition')}: {expeditions.find(e => e.id === selectedExpedition)?.name || selectedExpedition}</span>
                <button onClick={() => setSelectedExpedition('all')} aria-label={t('expedition')} className="hover:text-[var(--snow)]"><X className="w-3 h-3" /></button>
              </span>
            )}
            <button
              onClick={handleReset}
              className="text-[11px] text-[var(--mist)] hover:text-[var(--glacier)] underline ml-1 cursor-pointer"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Results Count Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--mist)] tabular border-b border-[var(--line)] pb-3">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-[var(--snow)]">{t('results', { count: assets.length })}</span>
          {activeFilterCount > 0 && (
            <span className="text-[var(--glacier)] text-[11px]">
              ({activeFilterCount}&nbsp;active)
            </span>
          )}
        </div>
      </div>

      {/* Asset Cards Container */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-2xl border border-[var(--line)] bg-[var(--navy-raised)] p-6 h-64 shimmer" />
          ))}
        </div>
      ) : loadError ? (
        <p role="alert" className="p-6 rounded-2xl border border-rose-400/30 bg-rose-500/5 text-rose-200 text-sm">{t('loadError')}</p>
      ) : assets.length === 0 ? (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--navy-raised)] p-12 text-center space-y-3">
          <Compass className="w-10 h-10 text-[var(--mist)] mx-auto" aria-hidden="true" />
          <h3 className="text-base font-semibold text-[var(--snow)] font-display text-balance">{t('noResults')}</h3>
          <p className="text-xs text-[var(--mist)] max-w-sm mx-auto">{t('noResultsHint')}</p>
          {activeFilterCount > 0 && (
            <button
              onClick={handleReset}
              className="mt-2 inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[var(--glacier)] text-[#06121e] text-xs font-semibold hover:bg-[var(--glacier)]/90 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--glacier)] cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t('reset')}</span>
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <Stagger immediate key={assets.map(a => a.id).join()} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {visible.map(asset => (
            <StaggerItem key={asset.id}>
              <Link
                href={`/asset/${asset.id}`}
                className="spotlight group relative rounded-2xl border border-[var(--line)] bg-[var(--navy-raised)] overflow-hidden h-full flex flex-col justify-between hover:border-[var(--glacier)]/50 hover:shadow-xl hover:shadow-[var(--glacier)]/5 transition-all duration-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--glacier)]"
              >
                {/* Optional Asset Thumbnail Banner */}
                {asset.thumbnail && (
                  <div className="relative h-52 w-full overflow-hidden bg-[var(--ink)] border-b border-[var(--line)]">
                    <img
                      src={smallThumbnail(asset.thumbnail)}
                      alt={asset.alt_text || asset.title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--navy-raised)] via-transparent to-transparent opacity-80" />
                  </div>
                )}

                <div className="p-6 space-y-3.5 min-w-0 flex-1 flex flex-col">
                  {/* Top Metadata Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--glacier)]/10 border border-[var(--glacier)]/25 text-[10px] font-mono font-semibold uppercase tracking-wider text-[var(--glacier)] shrink-0">
                        {getTypeIcon(asset.type)}
                        <span>{tTypes(asset.type)}</span>
                      </span>
                      <span className="text-[10px] font-medium text-[var(--mist)] px-2.5 py-1 rounded-md bg-[var(--ink)] border border-[var(--line)]">
                        {tRegions(asset.region)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {asset.ai_metadata?.mock && (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[var(--ink)] border border-[var(--glacier)]/30 text-[var(--glacier)]">
                          Demo AI
                        </span>
                      )}
                      {asset.year && (
                        <span className="text-xs text-[var(--mist)] font-mono tabular bg-[var(--ink)] px-2.5 py-0.5 rounded-md border border-[var(--line)]">
                          {asset.year}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold text-xl text-[var(--snow)] font-display group-hover:text-[var(--glacier)] transition-colors duration-200 line-clamp-2 leading-snug tracking-tight">
                    {hi && asset.title_hi ? asset.title_hi : asset.title}
                  </h3>

                  {/* Scientific Summary */}
                  <p className="text-xs text-[var(--mist)] line-clamp-3 leading-relaxed font-sans flex-1">
                    {hi && asset.ai_summary_hi ? asset.ai_summary_hi : asset.ai_summary || asset.description}
                  </p>

                  {/* Discipline / Format Tags */}
                  {asset.discipline && asset.discipline.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {asset.discipline.slice(0, 3).map(d => (
                        <span key={d} className="px-2 py-0.5 rounded bg-[var(--ink)] border border-[var(--line)] text-[10px] text-[var(--mist)] font-mono">
                          {d.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Bar */}
                <div className="p-6 pt-0">
                  <div className="pt-3.5 border-t border-[var(--line)] flex items-center justify-between text-xs text-[var(--mist)]">
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center space-x-1.5 tabular font-mono">
                        <Eye className="w-3.5 h-3.5 text-[var(--glacier)]" aria-hidden="true" />
                        <span>{asset.view_count || 0}</span>
                      </span>
                      <span className="flex items-center space-x-1.5 tabular font-mono">
                        <Download className="w-3.5 h-3.5 text-[var(--glacier)]" aria-hidden="true" />
                        <span>{asset.download_count || 0}</span>
                      </span>
                    </div>
                    <span className="text-[var(--glacier)] font-semibold flex items-center space-x-1 group-hover:translate-x-1 transition-transform duration-200">
                      <span>{t('details')}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </span>
                  </div>
                </div>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      ) : (
        /* List View */
        <div className="space-y-3">
          {visible.map(asset => (
            <Link
              key={asset.id}
              href={`/asset/${asset.id}`}
              className="spotlight group rounded-xl border border-[var(--line)] bg-[var(--navy-raised)] p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-[var(--glacier)]/50 hover:shadow-lg transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--glacier)]"
            >
              <div className="flex items-start space-x-4 min-w-0">
                {asset.thumbnail ? (
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-[var(--ink)] border border-[var(--line)] shrink-0">
                    <img src={smallThumbnail(asset.thumbnail)} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-[var(--glacier)]/10 border border-[var(--glacier)]/25 text-[var(--glacier)] mt-0.5 shrink-0">
                    {getTypeIcon(asset.type)}
                  </div>
                )}
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[var(--glacier)] bg-[var(--glacier)]/10 px-2 py-0.5 rounded">
                      {tTypes(asset.type)}
                    </span>
                    <span className="text-xs text-[var(--mist)] font-mono tabular bg-[var(--ink)] px-2 py-0.5 rounded border border-[var(--line)]">
                      {asset.year}
                    </span>
                    <span className="text-xs text-[var(--mist)] bg-[var(--ink)] px-2 py-0.5 rounded border border-[var(--line)]">
                      {tRegions(asset.region)}
                    </span>
                    {asset.ai_metadata?.mock && (
                      <span className="text-[9px] font-mono text-[var(--glacier)] bg-[var(--ink)] px-1.5 py-0.5 rounded border border-[var(--glacier)]/30">
                        Demo AI
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-base text-[var(--snow)] font-display group-hover:text-[var(--glacier)] transition-colors duration-200 truncate">
                    {hi && asset.title_hi ? asset.title_hi : asset.title}
                  </h3>
                  <p className="text-xs text-[var(--mist)] line-clamp-1">{asset.description}</p>
                </div>
              </div>

              <div className="flex items-center space-x-4 self-end sm:self-center shrink-0">
                <span className="text-xs text-[var(--mist)] truncate max-w-[160px] font-sans">{asset.authors?.[0]}</span>
                <span className="text-xs font-semibold text-[var(--glacier)] flex items-center space-x-1 group-hover:translate-x-1 transition-transform duration-200">
                  <span>{t('details')}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!loading && !loadError && shown < assets.length && (
        <div className="flex flex-col items-center gap-2 pt-4">
          <button type="button" onClick={() => setShown(s => s + PAGE_SIZE)} className="btn-ghost">
            {t('showMore', { count: Math.min(PAGE_SIZE, assets.length - shown) })}
          </button>
          <p className="text-xs text-[var(--mist)] tabular">{t('showing', { shown: visible.length, total: assets.length })}</p>
        </div>
      )}
    </div>
  );
}

export default function ExplorePage() {
  const t = useTranslations('explore');
  return (
    <Suspense
      fallback={
        // Same footprint as the loaded page, so the footer never jumps into view and back (CLS).
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-24 space-y-10 min-h-[140dvh]" role="status" aria-label={t('loadingSearch')}>
          <div className="shimmer h-40 rounded-md" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => <div key={i} className="shimmer h-72 rounded-md" />)}
          </div>
        </div>
      }
    >
      <ExploreContent />
    </Suspense>
  );
}
