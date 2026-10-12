'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export interface ScrollerItem {
  code: string;
  href: string;
  year: string;
  name: string;
  nameLang?: string;
  region: string;
  when: string;
  milestone: string | null;
  milestoneLang?: string;
}

interface Props {
  eyebrow: string;
  title: string;
  intro: string;
  openLabel: string;
  allLabel: string;
  items: ScrollerItem[];
}

/**
 * "Forty-five years on the ice": a pinned band whose track of expeditions slides sideways as the
 * page scrolls (framer-motion useScroll, transform only). Phones and reduced-motion visitors get
 * a plain swipeable row instead of the pinned scroll.
 */
export function ExpeditionScroller({ eyebrow, title, intro, openLabel, allLabel, items }: Props) {
  const reduce = useReducedMotion();
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLOListElement>(null);
  const [distance, setDistance] = useState(0);
  const [pinned, setPinned] = useState(false);

  // Pin only on wide screens with motion allowed; measure how far the track must travel.
  useEffect(() => {
    const measure = () => {
      const wide = window.matchMedia('(min-width: 1024px)').matches;
      setPinned(wide && !reduce);
      if (track.current) setDistance(Math.max(0, track.current.scrollWidth - window.innerWidth + 64));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [reduce, items.length, pinned]);

  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] });
  const smooth = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });
  const x = useTransform(smooth, (v) => -v * distance);
  const bar = useTransform(smooth, [0, 1], ['0%', '100%']);

  const header = (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-end justify-between gap-6">
      <div className="space-y-3 max-w-2xl">
        <p className="eyebrow">{eyebrow}</p>
        <h2 id="exp-scroller-h" className="display text-4xl sm:text-6xl">{title}</h2>
        <p className="text-[var(--snow)]/75 leading-relaxed">{intro}</p>
      </div>
      <Link href="/expeditions" prefetch={true} className="btn-ghost group">
        {allLabel} <ArrowRight className="w-4 h-4 transition-transform duration-500 group-hover:translate-x-1" aria-hidden />
      </Link>
    </div>
  );

  const cards = items.map((e, i) => (
    <li key={e.code} className="shrink-0 w-[82vw] sm:w-[26rem] snap-start">
      <Link href={e.href} prefetch={true} className="group relative flex h-full flex-col justify-between gap-8 border-l border-[var(--line)] pl-6 pr-4 py-2 transition-colors duration-500 hover:border-[var(--glacier)]">
        <div className="space-y-4">
          <p aria-hidden data-text={e.year} className="ghost-text font-display font-bold tabular leading-none text-7xl sm:text-8xl text-[var(--snow)]/15 transition-colors duration-700 group-hover:text-[var(--glacier)]" />
          <p className="micro-cap text-[var(--glacier)]">
            {String(i + 1).padStart(2, '0')} · {e.code} · {e.region}
          </p>
          <h3 className="font-display text-2xl font-bold leading-tight text-[var(--snow)]" lang={e.nameLang}>{e.name}</h3>
          <p className="text-sm text-[var(--mist)] tabular">{e.when}</p>
          {e.milestone && <p className="text-[var(--snow)]/75 leading-relaxed line-clamp-3" lang={e.milestoneLang}>{e.milestone}</p>}
        </div>
        <span className="micro-cap inline-flex items-center gap-2 text-[var(--snow)]">
          {openLabel}
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line)] transition-[transform,border-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1 group-hover:border-[var(--snow)]">
            <ArrowRight className="w-3.5 h-3.5" aria-hidden />
          </span>
        </span>
      </Link>
    </li>
  ));

  // One DOM structure for both modes, so useScroll stays bound to the same element.
  return (
    <section
      ref={section}
      className="relative border-y border-[var(--line)]"
      style={pinned ? { height: `calc(100dvh + ${distance}px)` } : undefined}
      aria-labelledby="exp-scroller-h"
    >
      <div className={pinned ? 'sticky top-0 flex h-[100dvh] flex-col justify-center gap-14 overflow-hidden py-16' : 'py-24 space-y-10'}>
        {header}
        <motion.ol
          ref={track}
          style={pinned ? { x } : undefined}
          className={
            pinned
              ? 'flex gap-10 pl-[max(2rem,calc((100vw-80rem)/2+2rem))] pr-16 will-change-transform'
              : 'flex gap-6 overflow-x-auto snap-x snap-mandatory px-4 sm:px-6 lg:px-8 pb-4 [scrollbar-width:thin]'
          }
        >
          {cards}
        </motion.ol>
        {pinned && (
          /* Progress hairline */
          <div className="max-w-7xl mx-auto w-full px-8">
            <div className="h-px w-full bg-[var(--line)]">
              <motion.div className="h-px bg-[var(--glacier)]" style={{ width: bar }} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
