import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { getCurrentUser, STAFF_ROLES } from '@/lib/db/auth';
import { isLookOnly } from '@/lib/demo';

export const metadata: Metadata = { title: 'Staff workspace', robots: { index: false, follow: false } };

/**
 * Every /admin page is staff-only, enforced here on the server (not just in the APIs):
 * signed-out visitors go to /login, signed-in non-staff see a clear "no access" page.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/admin');

  if (!STAFF_ROLES.includes(user.role)) {
    return (
      <main className="min-h-dvh flex items-center justify-center px-4">
        <div className="max-w-md space-y-4 text-center">
          <p className="eyebrow">Staff workspace</p>
          <h1 className="text-3xl font-semibold">No staff access</h1>
          <p className="text-[var(--mist)]">
            You are signed in as {user.email ?? 'a visitor'}, which does not have a staff role. Ask a DHRUV super admin to grant one.
          </p>
          <Link href="/" className="inline-block text-[var(--glacier)]">Back to the portal</Link>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-dvh lg:flex bg-[var(--ink)]">
      <AdminSidebar role={user.role} email={user.email ?? null} />
      <main id="main" className="flex-1 min-w-0 px-4 py-6 sm:px-8 sm:py-10">
        {isLookOnly(user.email) && (
          <p role="note" className="mb-8 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-[var(--glacier)]/30 bg-[var(--glacier)]/[0.06] px-4 py-3 text-sm text-[var(--snow)]/85">
            <span className="micro-cap text-[var(--glacier)]">Look-only demo</span>
            <span>Browse everything. Buttons that change content are switched off on this public demo, so every judge sees the same archive.</span>
          </p>
        )}
        {children}
      </main>
    </div>
  );
}
