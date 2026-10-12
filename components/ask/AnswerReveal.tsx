'use client';

import React, { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import Markdown from '@/components/shared/Markdown';

/**
 * Reveals a finished answer progressively (about a second, whatever its length), so reading
 * starts at once instead of the whole block popping in. The text is already complete; this is
 * presentation only. Reduced motion shows it immediately.
 */
export function AnswerReveal({ text, onDone, lang }: { text: string; onDone?: () => void; lang?: string }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? text.length : 0);

  useEffect(() => {
    if (reduce) {
      setShown(text.length);
      onDone?.();
      return;
    }
    const step = Math.max(3, Math.ceil(text.length / 70));
    let n = 0;
    const id = window.setInterval(() => {
      n = Math.min(text.length, n + step);
      setShown(n);
      if (n >= text.length) {
        window.clearInterval(id);
        onDone?.();
      }
    }, 16);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, reduce]);

  // Cut at a word boundary so half-words and half-links never flash.
  const cut = shown >= text.length ? text : text.slice(0, text.lastIndexOf(' ', shown) + 1 || shown);
  return (
    <div className="answer-prose" lang={lang} aria-live="off">
      <Markdown>{cut}</Markdown>
      {shown < text.length && <span aria-hidden className="inline-block h-4 w-2 translate-y-0.5 bg-[var(--glacier)] animate-pulse" />}
    </div>
  );
}
