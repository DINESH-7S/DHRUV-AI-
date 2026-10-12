'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { EASE } from '@/components/motion/Reveal';

/**
 * What Ask Dhruv is doing while it works. The three stages are the real pipeline in order
 * (search the archive, read the matching passages, write a cited answer); the switch between
 * them is timed, because the server answers in one response.
 */
export function ThinkingStages({ labels }: { labels: [string, string, string] }) {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const a = window.setTimeout(() => setStage(1), 1100);
    const b = window.setTimeout(() => setStage(2), 2600);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, []);

  return (
    <div role="status" aria-live="polite" className="space-y-5">
      <ol className="space-y-2.5">
        {labels.map((label, i) => (
          <motion.li
            key={label}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: i <= stage ? 1 : 0.35, x: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: i * 0.08 }}
            className="flex items-center gap-3 text-sm"
          >
            <span className="relative flex h-5 w-5 items-center justify-center">
              <AnimatePresence mode="wait" initial={false}>
                {i < stage ? (
                  <motion.span key="done" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--glacier)] text-[var(--ink)]">
                    <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                  </motion.span>
                ) : i === stage ? (
                  <motion.span key="now" className="h-2.5 w-2.5 rounded-full bg-[var(--glacier)] motion-safe:animate-ping" />
                ) : (
                  <motion.span key="todo" className="h-1.5 w-1.5 rounded-full bg-[var(--mist)]" />
                )}
              </AnimatePresence>
            </span>
            <span className={i === stage ? 'text-[var(--snow)]' : 'text-[var(--mist)]'}>{label}</span>
          </motion.li>
        ))}
      </ol>
      {/* Shimmer lines where the answer will appear */}
      <div aria-hidden className="space-y-2.5">
        {[92, 100, 78].map((w, i) => (
          <div key={i} className="shimmer h-3 rounded-sm" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  );
}
