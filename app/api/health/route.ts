import { NextResponse } from 'next/server';
import { aiProvider, modelName } from '@/lib/ai/llm';
import { supabaseAdmin } from '@/lib/db/admin';
import { embeddingMode } from '@/lib/ai/embed';
import { isAiMock, isDbConfigured } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/health → liveness for uptime monitors and the staff dashboard.
 * 200 when the database answers, 503 otherwise. Never returns secrets.
 */
export async function GET() {
  const started = Date.now();
  let db: 'ok' | 'down' | 'not_configured' = 'not_configured';
  if (isDbConfigured()) {
    const { error } = await supabaseAdmin().from('stations').select('id', { head: true, count: 'exact' });
    db = error ? 'down' : 'ok';
  }
  const mock = isAiMock();
  const body = {
    status: db === 'down' ? 'degraded' : 'ok',
    db,
    ai: {
      provider: mock ? 'mock' : aiProvider(),
      model: mock ? null : modelName('smart'),
      embeddings: embeddingMode(),
    },
    latency_ms: Date.now() - started,
  };
  return NextResponse.json(body, { status: db === 'down' ? 503 : 200, headers: { 'Cache-Control': 'no-store' } });
}
