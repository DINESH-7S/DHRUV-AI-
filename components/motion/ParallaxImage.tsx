"use client";

import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';

/**
 * Image that drifts slightly slower than the page while its frame scrolls past (transform only).
 * The frame must be `relative overflow-hidden`; the image is over-scaled so edges never show.
 *
 * The server cannot know the visitor's reduced-motion setting, so the first client render must
 * match the server (parallax on); the static version is swapped in after mount.
 */
export function ParallaxImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['-7%', '7%']);

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      {mounted && reduce ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} style={{ transform: 'scale(1.16)' }} className={className} />
      ) : (
        <motion.img src={src} alt={alt} style={{ y, scale: 1.16 }} className={className} />
      )}
    </div>
  );
}
