/**
 * Creates the demo's news content through the real Content Studio APIs (dev server with
 * DEV_AUTH_BYPASS=true): a blog post + press release in EN and HI from the 2024-25 annual report,
 * reviewed and published; plus social posts from the Maitri photo left in the review queue so the
 * approval step can be shown live.  Run:  npm run publish-demo-news
 */
import { createClient } from '@supabase/supabase-js';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${init?.method ?? 'GET'} ${path} → ${res.status}: ${body.error ?? JSON.stringify(body)}`);
  return body as T;
}

interface Post { id: string; channel: string; language: string; status: string; body: string }

async function assetId(title: string): Promise<string> {
  const { data } = await db.from('assets').select('id').eq('title', title).eq('status', 'published').single();
  if (!data) throw new Error(`Asset not found: ${title}`);
  return data.id;
}

async function main() {
  const report = await assetId('NCPOR Annual Report 2024-25');
  console.log('▶ Website news from the 2024-25 annual report (blog + press release, EN + HI)');
  const news = await api<Post[]>('/api/campaign', {
    method: 'POST',
    body: JSON.stringify({ assetId: report, channels: ['blog', 'press_release'], languages: ['en', 'hi'] }),
  });
  for (const post of news) {
    for (const action of ['submit', 'approve', 'publish'] as const) {
      await api(`/api/posts/${post.id}`, { method: 'PATCH', body: JSON.stringify({ action, note: action === 'approve' ? 'Facts checked against the annual report.' : undefined }) });
    }
    console.log(`  published ${post.language}/${post.channel}: ${post.body.split('\n')[0].slice(0, 90)}`);
  }

  const photo = await assetId('Maitri, Indian station in Antarctica');
  console.log('▶ Social posts from the Maitri photo → review queue (for the live approval demo)');
  const social = await api<Post[]>('/api/campaign', {
    method: 'POST',
    body: JSON.stringify({ assetId: photo, channels: ['x', 'instagram', 'linkedin'], languages: ['en'] }),
  });
  for (const post of social) {
    await api(`/api/posts/${post.id}`, { method: 'PATCH', body: JSON.stringify({ action: 'submit' }) });
    console.log(`  in review ${post.language}/${post.channel}: ${post.body.slice(0, 90).replace(/\n/g, ' ')}`);
  }
  console.log('\n✅ Done');
}

main().catch((err) => {
  console.error('\n❌', err instanceof Error ? err.message : err);
  process.exit(1);
});
