/**
 * Head-to-head of AI providers on real DHRUV tasks, using the app's own prompts and schemas.
 *   npm run ai-compare                  (default: gemini vs ollama)
 *   npm run ai-compare -- ollama        (one provider)
 * Tasks: catalogue a real report (EN + HI), answer archive questions (EN + HI) with citations,
 * draft X + LinkedIn posts. Embeddings stay on the current model for all providers so only the
 * language model is compared; bge-m3 gets its own cross-language sanity check at the end.
 */
import { createClient } from '@supabase/supabase-js';
import { answerQuestion } from '../lib/ai/chat';
import { generateCampaign } from '../lib/ai/campaign';
import { generateStructured, modelName } from '../lib/ai/llm';
import { DOCUMENT_SYSTEM } from '../lib/ai/prompts';
import { DocumentInsightsSchema } from '../lib/ai/schemas';
import { embeddingMode } from '../lib/ai/embed';
import { ollamaEmbed } from '../lib/ai/ollama';
import type { Asset } from '../lib/types/database';

const REPORT_ID = 'cf1a3665-da5a-4bd4-9186-726161c05cfb'; // NCPOR Annual Report 2024-25
const PHOTO_ID = '86d5306e-3e1f-4e24-9853-f5ee6d2ebf4b'; // Maitri station photo
const QUESTIONS: { q: string; locale: 'en' | 'hi' }[] = [
  { q: 'What did Indian scientists do on the Nivlisen Ice Shelf?', locale: 'en' },
  { q: 'मैत्री स्टेशन कब स्थापित हुआ और वहाँ कौन-सा शोध होता है?', locale: 'hi' },
  { q: 'हिमांश स्टेशन पर शीतकालीन अभियान के बारे में बताइए।', locale: 'hi' },
];

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });

const secs = (t: number) => `${((Date.now() - t) / 1000).toFixed(1)} s`;
const devanagari = (s: string) => (s.match(/[ऀ-ॿ]/g)?.length ?? 0) / Math.max(1, s.replace(/\s/g, '').length);

async function run(provider: string) {
  process.env.AI_PROVIDER = provider;
  console.log(`\n══════════ ${provider.toUpperCase()} · ${modelName('smart')} ══════════`);
  const usage = { input: 0, output: 0 };

  // 1. Catalogue a real report from its extracted text.
  const { data: chunks } = await admin.from('asset_chunks').select('content').eq('asset_id', REPORT_ID).order('chunk_index').limit(12);
  const text = (chunks ?? []).map(c => c.content).join('\n\n');
  let t = Date.now();
  try {
    const r = await generateStructured({
      tier: 'smart', system: DOCUMENT_SYSTEM, schema: DocumentInsightsSchema, maxTokens: 3000, patient: true,
      content: `Title: NCPOR Annual Report 2024-25\nType: report | Region: antarctic | Year: 2025\n\n<document>\n${text}\n</document>`,
    });
    const d = r.data as Record<string, unknown>;
    console.log(`[1] catalogue ✓ ${secs(t)} · ${r.usage.input}/${r.usage.output} tok`);
    console.log(`    summary: ${String(d.summary ?? '').slice(0, 220)}`);
    console.log(`    Hindi summary (${Math.round(devanagari(String(d.summary_hi ?? '')) * 100)}% Devanagari): ${String(d.summary_hi ?? '').slice(0, 160)}`);
    console.log(`    keywords: ${(d.keywords as string[] | undefined)?.slice(0, 8).join(', ')}`);
  } catch (e) {
    console.log(`[1] catalogue ✗ ${secs(t)} · ${e instanceof Error ? e.message.slice(0, 200) : e}`);
  }

  // 2. Ask Dhruv (same retrieval for every provider; only the answering model differs).
  for (const { q, locale } of QUESTIONS) {
    t = Date.now();
    try {
      const a = await answerQuestion(anon, q, locale, usage);
      const cites = a.answer.match(/\[\d+\]/g)?.length ?? 0;
      console.log(`[2] ask (${locale}) ✓ ${secs(t)} · ${cites} citation marks · ${locale === 'hi' ? `${Math.round(devanagari(a.answer) * 100)}% Devanagari · ` : ''}${a.answer.replace(/\s+/g, ' ').slice(0, 230)}`);
    } catch (e) {
      console.log(`[2] ask (${locale}) ✗ ${secs(t)} · ${e instanceof Error ? e.message.slice(0, 200) : e}`);
    }
  }

  // 3. Social drafts with channel rules (X ≤ 280 characters).
  const { data: photo } = await admin.from('assets').select('*').eq('id', PHOTO_ID).single();
  t = Date.now();
  try {
    const c = await generateCampaign(photo as Asset, ['x', 'linkedin'], ['en'], '{{site}}/asset/' + PHOTO_ID, usage);
    for (const p of c.posts) console.log(`[3] ${p.channel} ✓ ${(p.body + ' ' + p.hashtags.join(' ')).length} chars · ${p.body.replace(/\s+/g, ' ').slice(0, 160)}`);
    console.log(`    campaign time ${secs(t)}`);
  } catch (e) {
    console.log(`[3] campaign ✗ ${secs(t)} · ${e instanceof Error ? e.message.slice(0, 200) : e}`);
  }
}

async function embeddingCheck() {
  console.log('\n══════════ bge-m3 cross-language check ══════════');
  const cos = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0) / (Math.hypot(...a) * Math.hypot(...b));
  const t = Date.now();
  const [qHi, relevant, unrelated] = await ollamaEmbed([
    'मैत्री स्टेशन कब स्थापित हुआ?',
    "Maitri, India's second permanent research station in Antarctica, was commissioned in 1989 in the Schirmacher Oasis.",
    'Aerosol black carbon was measured over the Chandra basin in the western Himalaya.',
  ]);
  console.log(`dims ${qHi.length} · ${secs(t)} · Hindi question ↔ matching English text: ${cos(qHi, relevant).toFixed(3)} · ↔ unrelated text: ${cos(qHi, unrelated).toFixed(3)}`);
}

async function main() {
  // Queries must use the model the archive was embedded with. Without this pin, switching
  // AI_PROVIDER to ollama would also switch queries to bge-m3 while the stored vectors are Voyage's.
  const retrieval = embeddingMode();
  if (retrieval !== 'mock') process.env.EMBEDDING_PROVIDER = retrieval;
  console.log(`Retrieval embeddings: ${retrieval} (the same for every provider)`);
  const providers = process.argv.slice(2).filter(a => !a.startsWith('-'));
  for (const p of providers.length ? providers : ['gemini', 'ollama']) await run(p);
  await embeddingCheck().catch(e => console.log('embedding check ✗', e instanceof Error ? e.message : e));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
