import React from 'react';

/** House easing: fast start, long soft settle (reads as "mass", not "linear"). */
export const EASE = [0.32, 0.72, 0, 1] as const;

/*
 * Scroll reveals are pure CSS (`.reveal` in app/globals.css, a scroll-driven animation on
 * `animation-timeline: view()`), not JavaScript. Content is visible in the server HTML, so the
 * largest paint never waits for React to hydrate (this used to cost 2-4 s on budget phones).
 * Browsers without scroll-driven animations simply show the content; reduced motion disables it.
 * The components keep their old API so pages did not change.
 */

type Tag = 'div' | 'section' | 'li' | 'article' | 'header' | 'ul' | 'ol' | 'dl';

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** Kept for API compatibility; scroll position drives the timing now. */
  delay?: number;
  /** Starting offset in px (transform only, never layout). */
  y?: number;
  as?: 'div' | 'section' | 'li' | 'article' | 'header';
}

const cx = (...c: (string | undefined | false)[]) => c.filter(Boolean).join(' ');

/** Fades and lifts its children in as they scroll into view. */
export function Reveal({ children, className, y = 28, as = 'div' }: RevealProps) {
  const El = as as Tag;
  return (
    <El className={cx('reveal', className)} style={{ '--reveal-y': `${y}px` } as React.CSSProperties}>
      {children}
    </El>
  );
}

interface StaggerProps {
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'ul' | 'ol' | 'dl';
  /** Kept for API compatibility: on-screen content is simply visible. */
  immediate?: boolean;
}

/** Parent for StaggerItem. Items reveal one after another as each enters the viewport. */
export function Stagger({ children, className, as = 'div' }: StaggerProps) {
  const El = as as Tag;
  return <El className={className}>{children}</El>;
}

export function StaggerItem({
  children,
  className,
  as = 'div',
}: {
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'li' | 'article';
}) {
  const El = as as Tag;
  return (
    <El className={cx('reveal', className)} style={{ '--reveal-y': '24px' } as React.CSSProperties}>
      {children}
    </El>
  );
}
