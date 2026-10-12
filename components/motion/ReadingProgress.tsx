'use client';

import React from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';

/** Thin reading-progress bar pinned under the navbar (transform only; springs for smoothness). */
export function ReadingProgress() {
  const { scrollYProgress } = useScroll();
  const x = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.3 });
  return (
    <motion.div
      aria-hidden
      style={{ scaleX: x, transformOrigin: 'left' }}
      className="fixed left-0 right-0 top-16 z-40 h-0.5 bg-[var(--glacier)]"
    />
  );
}
