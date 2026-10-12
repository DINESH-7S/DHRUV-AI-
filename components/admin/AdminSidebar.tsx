"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LayoutDashboard, UploadCloud, Share2, CheckSquare, BookOpen, ArrowLeft, LogOut, HelpCircle, FlaskConical, Workflow } from 'lucide-react';
import type { UserRole } from '@/lib/types/database';
import { createSupabaseBrowserClient } from '@/lib/db/client';
import { cn } from '@/lib/utils';
import { PolarGraticule } from '@/components/graphics/PolarGraticule';

const ROLE_LABEL: Record<UserRole, string> = {
  super_admin: 'Super admin',
  scientist: 'Scientist (uploader)',
  outreach_officer: 'Outreach officer',
  reviewer: 'Reviewer',
  public: 'Visitor',
};

const ALL: UserRole[] = ['super_admin', 'scientist', 'outreach_officer', 'reviewer'];

/** Pages are listed only for roles whose APIs allow the work (see lib/db/workflow.ts and lib/db/auth.ts). */
const GROUPS: { title: string; items: { label: string; href: string; icon: React.ElementType; roles: UserRole[] }[] }[] = [
  { title: 'Overview', items: [{ label: 'Dashboard', href: '/admin', icon: LayoutDashboard, roles: ALL }] },
  {
    title: 'Archive',
    items: [
      { label: 'Upload & AI cataloguing', href: '/admin/upload', icon: UploadCloud, roles: ['super_admin', 'scientist'] },
      { label: 'Review queue', href: '/admin/review', icon: CheckSquare, roles: ['super_admin', 'reviewer', 'outreach_officer'] },
    ],
  },
  {
    title: 'Outreach',
    items: [
      { label: 'Upload once, get everything', href: '/admin/pack', icon: Workflow, roles: ALL },
      { label: 'Content studio', href: '/admin/studio', icon: Share2, roles: ['super_admin', 'outreach_officer'] },
      { label: 'Lessons', href: '/admin/lessons', icon: BookOpen, roles: ALL },
    ],
  },
  {
    title: 'Insight',
    items: [
      { label: 'What India asks', href: '/admin/insights', icon: HelpCircle, roles: ALL },
      { label: 'Answer accuracy', href: '/accuracy', icon: FlaskConical, roles: ALL },
    ],
  },
];

export function AdminSidebar({ role, email }: { role: UserRole; email: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    setSigningOut(true);
    await createSupabaseBrowserClient().auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href));

  return (
    <aside className="relative isolate overflow-hidden lg:w-72 lg:h-dvh lg:sticky lg:top-0 border-b lg:border-b-0 lg:border-r border-[var(--line)] bg-[var(--navy)] flex flex-col gap-6 p-4 lg:p-5">
      {/* Signature graphic, faint, behind the brand */}
      <div aria-hidden className="pointer-events-none absolute -left-40 -top-40 -z-10 w-[26rem] opacity-40">
        <PolarGraticule className="w-full h-auto" />
      </div>

      <div className="flex items-center justify-between gap-3 lg:block lg:space-y-6">
        <Link href="/admin" className="block">
          <p className="font-display text-2xl font-bold tracking-[0.18em] text-[var(--snow)]">DHRUV</p>
          <p className="micro-cap text-[var(--glacier)]">Staff workspace</p>
        </Link>
        <div className="flex items-center gap-3 rounded-md border border-[var(--line)] bg-[var(--ink)]/60 p-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--glacier)]/15 font-display text-lg font-bold text-[var(--glacier)]" aria-hidden>
            {(email ?? '?').slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 text-xs">
            <span className="block truncate text-[var(--snow)] max-w-[11rem]">{email ?? '-'}</span>
            <span className="block text-[var(--mist)]">{ROLE_LABEL[role]}</span>
          </span>
        </div>
      </div>

      <nav aria-label="Staff" className="flex gap-4 overflow-x-auto lg:flex-col lg:gap-5 lg:overflow-visible -mx-1 px-1">
        {GROUPS.map((g) => {
          const items = g.items.filter((i) => i.roles.includes(role));
          if (!items.length) return null;
          return (
            <div key={g.title} className="flex shrink-0 gap-1 lg:block lg:space-y-1">
              <p className="micro-cap hidden px-3 pb-1 text-[11px] text-[var(--mist)]/80 lg:block">{g.title}</p>
              {items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative flex items-center gap-3 whitespace-nowrap rounded-md px-3 py-2.5 text-sm transition-colors duration-300',
                      active ? 'text-[var(--snow)]' : 'text-[var(--mist)] hover:text-[var(--snow)] hover:bg-white/[0.04]',
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="admin-nav"
                        transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                        className="absolute inset-0 -z-10 rounded-md border border-[var(--glacier)]/25 bg-[var(--glacier)]/10"
                      >
                        <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-[var(--glacier)]" />
                      </motion.span>
                    )}
                    <Icon className={cn('h-4 w-4', active && 'text-[var(--glacier)]')} aria-hidden />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="flex lg:flex-col gap-1 lg:mt-auto pt-3 border-t border-[var(--line)]">
        <Link href="/" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-[var(--mist)] transition-colors hover:bg-white/[0.04] hover:text-[var(--snow)]">
          <ArrowLeft className="w-4 h-4" aria-hidden /> Public portal
        </Link>
        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-[var(--mist)] transition-colors hover:bg-white/[0.04] hover:text-[var(--snow)] disabled:opacity-60"
        >
          <LogOut className="w-4 h-4" aria-hidden /> {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </aside>
  );
}
