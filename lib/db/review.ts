import 'server-only';
import { supabaseAdmin } from './admin';

/** Audit actions that mean a signed-in reviewer looked at the item and approved it. */
const HUMAN_CHECK_ACTIONS = ['asset_publish', 'asset_verify'];

/**
 * Which of these assets a person has approved (published from the review queue, or marked as
 * checked afterwards). Items published by import scripts are not in the set, so the site can say
 * so instead of claiming staff approval.
 */
export async function humanCheckedIds(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const { data, error } = await supabaseAdmin()
    .from('audit_log')
    .select('entity_id')
    .eq('entity', 'assets')
    .in('action', HUMAN_CHECK_ACTIONS)
    .not('actor_id', 'is', null)
    .in('entity_id', ids);
  if (error) return new Set();
  return new Set((data ?? []).map((r) => r.entity_id as string));
}
