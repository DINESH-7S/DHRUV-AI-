// Demo accounts for the public hackathon deployment. Judges can sign in and look around the staff
// workspace, but nothing they click can change or delete content, or spend the AI allowance.
// The team turns changes back on for its own live demo with DEMO_ALLOW_WRITES=true.

/** Offered as quick sign-in buttons on /login when NEXT_PUBLIC_DEMO_MODE=true. */
export const DEMO_ACCOUNTS = [
  { key: 'demoUploader', email: 'scientist@dhruv.dev' },
  { key: 'demoReviewer', email: 'reviewer@dhruv.dev' },
] as const;

/**
 * Every account created by scripts/seed.ts shares one password, and demo mode ships that password
 * in the page code. So on a demo deployment all of them are look-only, including the seeded admin;
 * otherwise anyone could sign in as admin@dhruv.dev and change the archive.
 */
const SEEDED_ACCOUNTS = ['admin@dhruv.dev', 'scientist@dhruv.dev', 'outreach@dhruv.dev', 'reviewer@dhruv.dev'];

export const LOOK_ONLY_MESSAGE =
  'This demo account can look but not change anything, so the public demo stays the same for every judge. The demo video shows this step working.';

/** True when `email` is a seeded account on a deployment where they are look-only. Server-side only. */
export function isLookOnly(email: string | null | undefined): boolean {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true' || process.env.DEMO_ALLOW_WRITES === 'true' || !email) return false;
  return SEEDED_ACCOUNTS.includes(email.toLowerCase());
}
