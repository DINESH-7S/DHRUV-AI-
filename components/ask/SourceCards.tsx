'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight, Compass, FileText, MapPin, PlayCircle } from 'lucide-react';
import { EASE } from '@/components/motion/Reveal';

export interface Citation {
  n: number;
  asset_id: string | null;
  title: string;
  href: string;
}

/** What a citation opens: a video moment, a PDF page, the expedition timelines or the station directory. */
function kindOf(c: Citation) {
  if (c.href.includes('?t=')) return { Icon: PlayCircle, key: 'video' as const };
  if (c.href.includes('?page=')) return { Icon: FileText, key: 'page' as const };
  if (c.href.startsWith('/expeditions')) return { Icon: Compass, key: 'timeline' as const };
  if (!c.asset_id) return { Icon: MapPin, key: 'directory' as const };
  return { Icon: FileText, key: 'item' as const };
}

/** Numbered source cards under an answer; inline [n] chips jump here (id="src-<message>-<n>"). */
export function SourceCards({
  messageId,
  citations,
  labels,
}: {
  messageId: string;
  citations: Citation[];
  labels: Record<'video' | 'page' | 'timeline' | 'directory' | 'item', string>;
}) {
  return (
    <ol className="grid gap-2.5 sm:grid-cols-2">
      {citations.map((c, i) => {
        const { Icon, key } = kindOf(c);
        const [name, where] = c.title.split(' · ');
        return (
          <motion.li
            key={c.n}
            id={`src-${messageId}-${c.n}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: EASE, delay: 0.08 * i }}
            className="scroll-mt-28 target:ring-1 target:ring-[var(--glacier)] rounded-md"
          >
            <Link
              href={c.href}
              className="group flex h-full items-start gap-3 rounded-md border border-[var(--line)] bg-[var(--navy-raised)]/60 p-3.5 transition-[border-color,background-color,transform] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:border-[var(--glacier)]/50 hover:bg-[var(--navy-raised)]"
            >
              <span className="flex h-7 min-w-7 items-center justify-center rounded-sm bg-[var(--glacier)]/12 px-1.5 font-mono text-xs font-semibold text-[var(--glacier)]">{c.n}</span>
              <span className="min-w-0 flex-1 space-y-1">
                <span className="block text-sm font-medium leading-snug text-[var(--snow)] line-clamp-2">{name}</span>
                <span className="micro-cap flex items-center gap-1.5 text-[var(--mist)]">
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {labels[key]}
                  {where && <span className="normal-case tracking-normal font-mono text-[var(--glacier)]">{where}</span>}
                </span>
              </span>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-[var(--mist)] transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--snow)]" aria-hidden />
            </Link>
          </motion.li>
        );
      })}
    </ol>
  );
}
