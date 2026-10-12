import React from 'react';

/**
 * Headline words that rise from behind a mask, one after another (CSS `.word-rise`, no
 * JavaScript, reduced motion shows them at once). `start` offsets the stagger so several lines
 * can continue one sequence. Screen readers get the plain text once.
 */
export function SplitWords({ text, start = 0, className }: { text: string; start?: number; className?: string }) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {words.map((w, i) => (
          // The space sits outside the inline-block mask: trailing spaces inside it collapse.
          <React.Fragment key={i}>
            <span className="word-mask">
              <span className="word-rise" style={{ '--w': start + i } as React.CSSProperties}>
                {w}
              </span>
            </span>
            {i < words.length - 1 ? ' ' : ''}
          </React.Fragment>
        ))}
      </span>
    </span>
  );
}
