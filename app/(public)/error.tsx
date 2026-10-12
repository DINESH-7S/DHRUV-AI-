"use client";

import { useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

/** Honest error state for public pages (e.g. the archive database is unreachable). Never falls back to made-up content. */
export default function PublicError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('common');
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[70dvh] flex items-center justify-center px-4 py-20">
      <div role="alert" className="max-w-lg space-y-5 text-center">
        <h1 className="text-4xl font-semibold">{t('errorTitle')}</h1>
        <p className="text-lg text-[var(--mist)] leading-relaxed">{t('errorText')}</p>
        {error.digest && <p className="font-mono text-xs text-[var(--mist)]">ref {error.digest}</p>}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <button type="button" onClick={reset} className="px-5 py-3 rounded-full bg-[var(--glacier)] text-[#06121e] font-semibold">
            {t('tryAgain')}
          </button>
          <Link href="/" className="text-[var(--glacier)] font-medium">{t('goHome')}</Link>
        </div>
      </div>
    </div>
  );
}
