import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Magnetic } from '@/components/motion/Magnetic';
import { SplitWords } from '@/components/motion/SplitWords';

interface HeroIntroProps {
  eyebrow: string;
  line1: string;
  line2: string;
  intro: string;
  askLabel: string;
  exploreLabel: string;
}

/**
 * Hero copy with a staggered entrance on first paint. CSS keyframes (`.rise` in globals.css), not
 * JavaScript: the headline paints in the first frames instead of after hydration (LCP).
 * One ghost pill per band, a second action as a text link (DESIGN.md).
 */
export function HeroIntro({ eyebrow, line1, line2, intro, askLabel, exploreLabel }: HeroIntroProps) {
  return (
    <div className="space-y-7 max-w-2xl">
      <p style={{ '--i': 0 } as React.CSSProperties} className="rise eyebrow">
        {eyebrow}
      </p>

      <h1 className="text-[2.6rem] sm:text-6xl lg:text-7xl leading-[0.98] text-[var(--snow)] font-display">
        <SplitWords text={line1} className="block" />
        <SplitWords text={line2} start={line1.split(/\s+/).length} className="block text-[var(--mist)]" />
      </h1>

      <p style={{ '--i': 2 } as React.CSSProperties} className="rise text-lg text-[var(--snow)]/85 leading-relaxed max-w-[54ch]">
        {intro}
      </p>

      <div style={{ '--i': 3 } as React.CSSProperties} className="rise flex flex-wrap items-center gap-x-8 gap-y-4 pt-2">
        <Magnetic>
          <Link href="/ask" prefetch={true} className="btn-ghost group">
            {askLabel}
            <ArrowRight className="w-4 h-4 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1" aria-hidden />
          </Link>
        </Magnetic>
        <Link href="/explore" prefetch={true} className="micro-cap group inline-flex items-center gap-2 text-[var(--snow)] hover:text-[var(--glacier)] rounded-md">
          {exploreLabel}
          <ArrowRight className="w-4 h-4 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
