import 'server-only';
import type { UserRole } from '../types/database';
import { createSupabaseServerClient } from './server';

export interface CurrentUser {
  /** null only when the dev auth bypass is active. */
  id: string | null;
  role: UserRole;
  email?: string | null;
}

export class AuthError extends Error {
  constructor(message: string, readonly status: 401 | 403) {
    super(message);
  }
}

export const STAFF_ROLES: UserRole[] = ['super_admin', 'scientist', 'outreach_officer', 'reviewer'];
export const UPLOAD_ROLES: UserRole[] = ['super_admin', 'scientist'];

/**
 * DEV_AUTH_BYPASS=true lets you use admin pages before login exists.
 * Ignored in production builds, so it can never ship to the deployed site.
 */
function devBypassUser(): CurrentUser | null {
  if (process.env.NODE_ENV !== 'production' && process.env.DEV_AUTH_BYPASS === 'true') {
    return { id: null, role: 'super_admin', email: 'dev-bypass@localhost' };
  }
  return null;
}

/**
 * LOCAL_DEMO_USER=reviewer@dhruv.dev opens the staff pages as that seeded account with no sign-in,
 * for recording the demo on the team's own laptop. Refused on public demo deployments
 * (NEXT_PUBLIC_DEMO_MODE=true), so it can't open the admin to the internet.
 */
let localDemo: Promise<CurrentUser | null> | null = null;
function localDemoUser(): Promise<CurrentUser | null> {
  // Looked up once per server start, so pages stay fast.
  return (localDemo ??= findLocalDemoUser());
}
async function findLocalDemoUser(): Promise<CurrentUser | null> {
  const email = process.env.LOCAL_DEMO_USER?.toLowerCase();
  if (!email || process.env.NEXT_PUBLIC_DEMO_MODE === 'true') return null;
  const { supabaseAdmin } = await import('./admin');
  const { data } = await supabaseAdmin().auth.admin.listUsers({ perPage: 200 });
  const user = data?.users.find((u) => u.email?.toLowerCase() === email);
  if (!user) return null;
  const { data: profile } = await supabaseAdmin().from('profiles').select('role').eq('id', user.id).single();
  return { id: user.id, role: (profile?.role as UserRole | undefined) ?? 'public', email };
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const bypass = devBypassUser() ?? (await localDemoUser());
  if (bypass) return bypass;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  return { id: user.id, role: (profile?.role as UserRole | undefined) ?? 'public', email: user.email ?? null };
}

/** Throws AuthError unless the signed-in user has one of the allowed roles. */
export async function requireRole(allowed: UserRole[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError('Please sign in first.', 401);
  if (!allowed.includes(user.role)) {
    throw new AuthError(`Your role (${user.role}) is not allowed to do this.`, 403);
  }
  return user;
}
