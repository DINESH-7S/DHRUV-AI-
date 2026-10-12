"use client";

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/db/client';
import { DEMO_ACCOUNTS } from '@/lib/demo';

/**
 * Demo sign-in shortcuts exist only when NEXT_PUBLIC_DEMO_MODE=true (hackathon demo deployments).
 * They never include an admin account: anyone can read client code, so these must be
 * low-privilege accounts on demo data only.
 */
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? '';

/** Only allow same-site relative redirects after sign-in. */
function safeNext(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/admin';
}

function LoginForm() {
  const t = useTranslations('login');
  const next = safeNext(useSearchParams().get('next'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: authError } = await createSupabaseBrowserClient().auth.signInWithPassword({ email, password });
    if (authError) {
      setError(t('failed'));
      setLoading(false);
      return;
    }
    // A full page load, so the server always sees the new session cookie (a client-side
    // push could reach /admin before the cookie was stored and bounce back to sign-in).
    window.location.assign(next);
  };

  const inputClass =
    'w-full px-4 py-3 rounded-md bg-[var(--ink)] border border-[var(--line)] text-[var(--snow)] placeholder:text-[var(--mist)]/70 transition-colors duration-300 focus:border-[var(--glacier)] outline-none';

  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-2">
      {/* The expedition photograph: who the archive is for (credited, toned). */}
      <figure className="relative hidden overflow-hidden bg-[var(--ink)] lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hero/south-pole-2010.webp" alt="" className="band-img absolute inset-0 h-full w-full object-cover object-[62%_center] opacity-80" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[var(--ink)] via-[var(--ink)]/40 to-transparent" />
        <figcaption className="absolute bottom-10 left-10 right-10 space-y-4">
          <p className="font-display text-5xl font-bold uppercase leading-[0.95] tracking-[0.02em] text-[var(--snow)]">DHRUV</p>
          <p className="max-w-md text-[var(--snow)]/80">{t('sideNote')}</p>
          <p className="text-[11px] text-[var(--snow)]/60">Photo: Thamban Meloth, CC BY-SA 4.0, toned</p>
        </figcaption>
      </figure>
      <div className="flex items-center justify-center px-4 py-16 sm:px-10">
      <div className="rise w-full max-w-md space-y-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-[var(--mist)] hover:text-[var(--snow)]">
          <ArrowLeft className="w-4 h-4" /> {t('back')}
        </Link>

        <header className="space-y-3">
          <p className="eyebrow">{t('eyebrow')}</p>
          <h1 className="text-5xl text-[var(--snow)]">{t('title')}</h1>
          <p className="text-[var(--mist)] leading-relaxed">{t('subtitle')}</p>
        </header>

        {error && (
          <p role="alert" className="p-4 rounded-xl border border-rose-400/30 bg-rose-500/5 text-rose-200 text-sm">
            {error}
          </p>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium">{t('email')}</label>
            <input id="email" type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium">{t('password')}</label>
            <input id="password" type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className={inputClass} />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-solid w-full inline-flex items-center justify-center gap-2 py-3.5 text-sm disabled:opacity-60 active:scale-[0.98] transition-transform"
          >
            {loading ? t('signingIn') : t('signIn')} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {DEMO_MODE && DEMO_PASSWORD && (
          <section aria-labelledby="demo-accounts" className="pt-6 border-t border-[var(--line)] space-y-3">
            <h2 id="demo-accounts" className="text-sm font-medium text-[var(--mist)]">{t('demoTitle')}</h2>
            <div className="flex flex-wrap gap-2">
              {DEMO_ACCOUNTS.map(account => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => { setEmail(account.email); setPassword(DEMO_PASSWORD); }}
                  className="chip"
                >
                  {t(account.key)}
                </button>
              ))}
            </div>
            <p className="text-xs text-[var(--mist)]">{t('demoNote')}</p>
          </section>
        )}
      </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
