"use client";

import React, { useEffect, useRef } from 'react';
import { animate, useInView, useReducedMotion } from 'framer-motion';
import { EASE } from './Reveal';

/**
 * Counts from 0 to `value` the first time it scrolls into view. Server-renders the final value
 * (SEO / no-JS), and writes text directly to the DOM so React does not re-render every frame.
 * Pair with `.tabular` so digits do not shift width while counting.
 */
export function CountUp({ value, suffix = '', duration = 1.8 }: { value: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' });
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || !inView || reduce) return;
    const controls = animate(0, value, {
      duration,
      ease: EASE,
      onUpdate: v => {
        el.textContent = `${Math.round(v).toLocaleString('en-IN')}${suffix}`;
      },
    });
    return () => controls.stop();
  }, [inView, reduce, value, suffix, duration]);

  return (
    <span ref={ref}>
      {value.toLocaleString('en-IN')}
      {suffix}
    </span>
  );
}
