import 'server-only';

const PLACEHOLDER = /your-|mock-|127\.0\.0\.1/;

function configured(value: string | undefined): value is string {
  return !!value && !PLACEHOLDER.test(value);
}

/** True when AI calls should return deterministic fixtures instead of hitting Claude/Voyage. */
export function isAiMock(): boolean {
  return process.env.AI_MOCK === 'true';
}

/** True when real Supabase credentials (including the service role key) are present. */
export function isDbConfigured(): boolean {
  return (
    configured(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    configured(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
    configured(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

export function hasVoyageKey(): boolean {
  return configured(process.env.VOYAGE_API_KEY);
}

export function hasAnthropicKey(): boolean {
  return configured(process.env.ANTHROPIC_API_KEY);
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!configured(value)) {
    throw new Error(`Missing environment variable ${name}. Add it to .env.local (see .env.example).`);
  }
  return value;
}
