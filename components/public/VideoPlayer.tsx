"use client";

import React, { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Play, ExternalLink } from 'lucide-react';
import type { VideoChapter } from '@/lib/types/database';
import { formatTimestamp } from '@/lib/utils';

interface VideoPlayerProps {
  youtubeId: string;
  title: string;
  chapters?: VideoChapter[];
  /** Seconds to start from, e.g. from an Ask Dhruv citation (?t=195). */
  startAt?: number;
}

/**
 * Click-to-load YouTube embed. Only a thumbnail is fetched until the visitor presses play, so a
 * page with a video costs one image, not ~1 MB of YouTube scripts. Uses youtube-nocookie.com
 * (no tracking cookies until playback). Videos stay on NCPOR's channel; nothing is re-hosted.
 */
export default function VideoPlayer({ youtubeId, title, chapters = [], startAt }: VideoPlayerProps) {
  const t = useTranslations('video');
  const hi = useLocale() === 'hi';
  const [playing, setPlaying] = useState(false);
  const [start, setStart] = useState(startAt ?? 0);

  const play = (from: number) => {
    setStart(from);
    setPlaying(true);
  };

  const src =
    `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1` +
    `&start=${Math.floor(start)}&cc_load_policy=1&hl=${hi ? 'hi' : 'en'}`;

  return (
    <div className="space-y-4">
      <div className="relative aspect-video overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--ink)]">
        {playing ? (
          // key: changing the start time reloads the player at the new moment.
          <iframe
            key={start}
            src={src}
            title={title}
            className="absolute inset-0 h-full w-full"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <button
            type="button"
            onClick={() => play(start)}
            className="group absolute inset-0 h-full w-full"
            aria-label={start ? t('playFrom', { time: formatTimestamp(start) }) : t('play')}
          >
            <img
              src={`https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
              decoding="async"
            />
            <span className="relative inline-flex items-center gap-2.5 rounded-full bg-[var(--glacier)] px-5 py-3 text-sm font-semibold text-[#06121e] shadow-lg transition-transform group-hover:scale-[1.03] group-active:scale-[0.98]">
              <Play className="h-4 w-4 fill-current" aria-hidden />
              {start ? t('playFrom', { time: formatTimestamp(start) }) : t('play')}
            </span>
          </button>
        )}
      </div>

      {chapters.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-[var(--snow)]">{t('chapters')}</h3>
          <ol className="grid gap-1 sm:grid-cols-2">
            {chapters.map((c) => {
              const active = playing && start === c.start_s;
              return (
                <li key={c.start_s}>
                  <button
                    type="button"
                    onClick={() => play(c.start_s)}
                    className={`flex w-full items-baseline gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-white/[0.04] ${active ? 'bg-[var(--glacier)]/10 text-[var(--glacier)]' : 'text-[var(--snow)]'}`}
                  >
                    <span className="tabular font-mono text-xs text-[var(--glacier)]">{formatTimestamp(c.start_s)}</span>
                    <span lang={hi && c.title_hi ? 'hi' : undefined}>{hi && c.title_hi ? c.title_hi : c.title}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      <a
        href={`https://www.youtube.com/watch?v=${youtubeId}${start ? `&t=${Math.floor(start)}s` : ''}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--mist)] hover:text-[var(--glacier)]"
      >
        {t('watchOnYoutube')} <ExternalLink className="h-3.5 w-3.5" aria-hidden />
      </a>
    </div>
  );
}
