"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { PolarGraticule } from '@/components/graphics/PolarGraticule';
import { POST_CODE } from '@/lib/posts/code';

/** One box for both kinds of check: certificate IDs and the 8-character codes on approved posts. */
export default function VerifyLookupPage() {
  const t = useTranslations('verify');
  const router = useRouter();
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = value.trim().toUpperCase();
    if (!id) return;
    router.push(POST_CODE.test(id) ? `/verify/post/${id}` : `/verify/${encodeURIComponent(id)}`);
  };

  return (
    <div className="relative isolate overflow-hidden">
      <div aria-hidden className="absolute -z-10 -right-64 -top-40 w-[46rem] max-w-none opacity-25 sm:-right-40">
        <PolarGraticule className="w-full h-auto" stations={[]} />
      </div>
      <div className="mx-auto flex min-h-[70dvh] max-w-2xl flex-col justify-center px-4 py-20 sm:px-6">
        <div className="rise space-y-6">
          <p className="eyebrow flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" aria-hidden /> DHRUV
          </p>
          <h1 className="text-5xl sm:text-6xl text-[var(--snow)]">{t('title')}</h1>
          <p className="max-w-[56ch] text-[var(--snow)]/80 leading-relaxed">{t('subtitle')}</p>
        </div>
        <form
          onSubmit={handleSubmit}
          style={{ '--i': 2 } as React.CSSProperties}
          className="rise mt-10 flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--navy-raised)] p-2 transition-colors duration-300 focus-within:border-[var(--glacier)]/70"
        >
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t('placeholder')}
            aria-label={t('placeholder')}
            autoCapitalize="characters"
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent px-3 py-2.5 font-mono text-sm text-[var(--snow)] placeholder:text-[var(--mist)]/70 focus:outline-none"
          />
          <button type="submit" disabled={!value.trim()} className="btn-solid inline-flex shrink-0 items-center gap-2 px-5 py-2.5 text-sm disabled:opacity-50">
            {t('button')} <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </form>
      </div>
    </div>
  );
}
