import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import * as z from 'zod/v4';
import { isAiMock } from '../env';
import { embedQuery } from './embed';
import { generateStructured, type TokenUsage, aiProvider } from './llm';
import { expandQuery } from '../search/glossary';
import { CHAT_SYSTEM } from './prompts';
import { formatTimestamp, parsePage, parseTimestamp } from '../utils';
import { dossierOf, expeditionWhen, isSourced, leaderOf } from '../expeditions';
import type { Expedition } from '../types/database';

const MATCH_COUNT = 8;
const MAX_SOURCES = 5;

export interface Citation {
  n: number;
  /** null for the station directory source. */
  asset_id: string | null;
  title: string;
  /** Where the citation links to. */
  href: string;
}

export interface ChatAnswer {
  answer: string;
  citations: Citation[];
  /** Which model wrote the answer; `open` = open-weight model on our own hardware (sovereign mode). */
  engine?: { model: string; open: boolean };
}

const AnswerSchema = z.object({
  answer: z.string().describe('The answer in Markdown, with [n] citation markers.'),
  used_sources: z.array(z.number().int()).describe('Numbers of the sources actually cited in the answer.'),
});

const NOT_FOUND: Record<'en' | 'hi', string> = {
  en: "I couldn't find anything about that in the DHRUV archive yet. Try different keywords, or browse the Explore page.",
  hi: 'मुझे DHRUV संग्रह में इस बारे में अभी कोई जानकारी नहीं मिली। कृपया अलग शब्दों से खोजें या Explore पेज देखें।',
};

interface Match {
  chunk_id: string;
  asset_id: string;
  content: string;
  score: number;
}

/**
 * Retrieval-augmented answer. `client` must be the viewer's RLS-bound client so that drafts and
 * restricted assets can never be retrieved for the public (hybrid_search is SECURITY INVOKER).
 */
export async function answerQuestion(
  client: SupabaseClient,
  question: string,
  locale: 'en' | 'hi',
  usage: TokenUsage,
): Promise<ChatAnswer> {
  const embedding = await embedQuery(question);
  // The keyword index is English: a Hindi question also searches for its English terms.
  const keywords = expandQuery(question);
  const { data: matches, error } = embedding
    ? await client.rpc('hybrid_search', { query_text: keywords, query_embedding: embedding, match_count: MATCH_COUNT })
    : // Embeddings unavailable (rate limit/outage): keyword search still answers most questions.
      await client
        .from('asset_chunks')
        .select('chunk_id:id, asset_id, content')
        .textSearch('content_tsv', keywords, { type: 'websearch', config: 'english' })
        .limit(MATCH_COUNT);
  if (error) throw new Error(`Search failed: ${error.message}`);

  // Group chunks by asset so each source number is one citable item.
  const byAsset = new Map<string, string[]>();
  // Video chunks start with "[m:ss]": the best-matching passage becomes the citation's jump point.
  const momentOf = new Map<string, number>();
  // PDF chunks start with "[p. 12]": the best-matching passage's page becomes the jump point.
  const pageOf = new Map<string, number>();
  for (const m of (matches ?? []) as Match[]) {
    if (!byAsset.has(m.asset_id) && byAsset.size >= MAX_SOURCES) continue;
    byAsset.set(m.asset_id, [...(byAsset.get(m.asset_id) ?? []), m.content]);
    const t = parseTimestamp(m.content);
    if (t !== null && !momentOf.has(m.asset_id)) momentOf.set(m.asset_id, t);
    const page = parsePage(m.content);
    if (page !== null && !pageOf.has(m.asset_id)) pageOf.set(m.asset_id, page);
  }
  const { data: assets } = byAsset.size
    ? await client.from('assets').select('id, title').in('id', [...byAsset.keys()])
    : { data: [] };
  const titles = new Map((assets ?? []).map((a) => [a.id as string, a.title as string]));

  const sources: (Citation & { text: string })[] = [...byAsset.entries()]
    .filter(([assetId]) => titles.has(assetId))
    .map(([assetId, texts], i) => {
      const t = momentOf.get(assetId);
      const page = pageOf.get(assetId);
      const title = titles.get(assetId)!;
      return {
        n: i + 1,
        asset_id: assetId,
        title: t !== undefined ? `${title} · ${formatTimestamp(t)}` : page !== undefined ? `${title} · p. ${page}` : title,
        href: t !== undefined ? `/asset/${assetId}?t=${t}` : page !== undefined ? `/asset/${assetId}?page=${page}` : `/asset/${assetId}`,
        // "[p. 12]" would read like a citation marker to the model: write the page out in words.
        text: texts.map((x) => x.replace(/^\[p\. (\d+)\] /, '(page $1) ')).join('\n…\n'),
      };
    });

  // Basic facts about the stations live in their own table, not in asset chunks; always offer them.
  const { data: stations } = await client.from('stations').select('name, region, established_year, status, description');
  if (stations?.length) {
    sources.push({
      n: sources.length + 1,
      asset_id: null,
      title: 'DHRUV station directory',
      href: '/explore',
      text: stations
        .map((s) => `${s.name} (${s.region}, established ${s.established_year}, ${s.status}): ${s.description}`)
        .join('\n'),
    });
  }
  // Sourced expedition timelines (content/expeditions.json) are directory data too: dates,
  // leaders and milestones that the scanned reports state only in passing.
  const { data: expeditions } = await client.from('expeditions').select('*').order('start_date');
  const timelines = ((expeditions ?? []) as Expedition[]).filter(isSourced);
  if (timelines.length) {
    sources.push({
      n: sources.length + 1,
      asset_id: null,
      title: 'DHRUV expedition timelines',
      href: '/expeditions',
      text: timelines
        .map((e) =>
          [
            `${e.name} (${e.code}, ${e.region}). Start: ${expeditionWhen(e, false)}.${leaderOf(e) ? ` Leader: ${leaderOf(e)}.` : ''}`,
            ...dossierOf(e)!.milestones.map((m) => `- ${m.date}: ${m.text}`),
          ].join('\n'),
        )
        .join('\n\n'),
    });
  }
  if (!sources.length) return { answer: NOT_FOUND[locale], citations: [] };

  if (isAiMock()) {
    const { n, asset_id, title, href } = sources[0];
    return { answer: `[Demo mode] The most relevant item is "${title}" [1].`, citations: [{ n, asset_id, title, href }] };
  }

  // Grounded answers from retrieved text: the fast tier keeps chat interactive (seconds, not a minute).
  const result = await generateStructured({
    tier: 'fast',
    system: CHAT_SYSTEM,
    schema: AnswerSchema,
    maxTokens: 4000,
    content:
      sources.map((s) => `<source n="${s.n}" title="${s.title.replace(/"/g, "'")}">\n${s.text}\n</source>`).join('\n\n') +
      `\n\nVisitor's question: ${question}\n\n` +
      (locale === 'hi' ? 'Answer in Hindi (Devanagari).' : 'Answer in English.'),
  });
  usage.input += result.usage.input;
  usage.output += result.usage.output;

  // Keep only citations that exist and actually appear in the answer text.
  const cited = new Set([...result.data.answer.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])));
  const citations = sources.filter((s) => cited.has(s.n)).map(({ n, asset_id, title, href }) => ({ n, asset_id, title, href }));

  return { answer: result.data.answer.trim(), citations, engine: { model: result.model, open: aiProvider() === 'ollama' } };
}
