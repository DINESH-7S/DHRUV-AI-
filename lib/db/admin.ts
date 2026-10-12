import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { requireEnv } from '../env';

let adminClient: SupabaseClient | null = null;

/**
 * Service-role client — bypasses RLS. Server-side writes only (ingestion, jobs, chunks).
 * Never use it for public reads or Ask Dhruv retrieval (SPEC §7.2).
 */
export function supabaseAdmin(): SupabaseClient {
  if (!adminClient) {
    adminClient = createClient(
      requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
      requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return adminClient;
}
