"use client";

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { MotionConfig } from 'framer-motion';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

let lenis: Lenis | null = null;

/**
 * Site-wide motion setup:
 * - Framer Motion follows the OS "reduce motion" setting.
 * - Lenis gives inertial smooth scrolling (skipped for reduced motion). Inner scroll areas
 *   opt out with `data-lenis-prevent`.
 * - One delegated pointer listener drives every `.spotlight` card (no per-card JS, rAF-throttled).
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    // Smooth wheel scrolling only helps mouse and trackpad users; phones scroll natively and
    // should not pay for a permanent animation loop.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    lenis = new Lenis({ lerp: 0.11, smoothWheel: true, wheelMultiplier: 1 });
    let frame = requestAnimationFrame(function raf(time) {
      lenis?.raf(time);
      frame = requestAnimationFrame(raf);
    });
    return () => {
      cancelAnimationFrame(frame);
      lenis?.destroy();
      lenis = null;
    };
  }, []);

  // New page → start at the top (Lenis would otherwise keep its own scroll position).
  useEffect(() => {
    lenis?.scrollTo(0, { immediate: true });
  }, [pathname]);

  useEffect(() => {
    if (!window.matchMedia('(hover: hover)').matches) return;
    let pending: PointerEvent | null = null;
    let scheduled = false;
    const update = () => {
      scheduled = false;
      const e = pending;
      if (!e) return;
      const card = (e.target as Element | null)?.closest?.('.spotlight') as HTMLElement | null;
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
      card.style.setProperty('--my', `${e.clientY - rect.top}px`);
    };
    const onMove = (e: PointerEvent) => {
      pending = e;
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(update);
      }
    };
    document.addEventListener('pointermove', onMove, { passive: true });
    return () => document.removeEventListener('pointermove', onMove);
  }, []);

  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
