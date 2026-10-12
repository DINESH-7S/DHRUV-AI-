import 'server-only';
import { hasVoyageKey, isAiMock, requireEnv } from '../env';
import { ollamaEmbed } from './ollama';

export const EMBEDDING_DIMS = 1024;
const VOYAGE_MODEL = 'voyage-3.5-lite';
const BATCH_SIZE = 64;
/** ~6K tokens at ~4 characters per token. */
const MAX_BATCH_CHARS = 24_000;
const MAX_ATTEMPTS = 10;

type InputType = 'document' | 'query';

interface VoyageResponse {
  data: { embedding: number[]; index: number }[];
  usage: { total_tokens: number };
}

export type EmbeddingMode = 'ollama' | 'voyage' | 'mock';

/**
 * Which embedding model is used. Documents and queries MUST use the same one, or vectors are not
 * comparable: after switching, re-embed the archive with `npm run reembed`.
 *   EMBEDDING_PROVIDER=ollama  bge-m3 on our own hardware (open source, the production path)
 *   EMBEDDING_PROVIDER=voyage  Voyage free tier (demo)
 * Unset: ollama when AI_PROVIDER=ollama, otherwise voyage when a key exists. With AI_MOCK=true or
 * nothing configured, a local bag-of-words hash embedding keeps keyword overlap ranking working.
 */
export function embeddingMode(): EmbeddingMode {
  if (isAiMock()) return 'mock';
  const explicit = process.env.EMBEDDING_PROVIDER;
  if (explicit === 'ollama' || explicit === 'voyage') return explicit === 'voyage' && !hasVoyageKey() ? 'mock' : explicit;
  if (process.env.AI_PROVIDER === 'ollama') return 'ollama';
  return hasVoyageKey() ? 'voyage' : 'mock';
}

/** bge-m3 expects no task prefixes; small batches keep a 4 GB GPU from running out of memory. */
const OLLAMA_BATCH = 16;

export async function embedTexts(texts: string[], inputType: InputType): Promise<number[][]> {
  if (texts.length === 0) return [];
  const mode = embeddingMode();
  if (mode === 'mock') return texts.map(mockEmbedding);

  const vectors: number[][] = [];
  if (mode === 'ollama') {
    for (let i = 0; i < texts.length; i += OLLAMA_BATCH) vectors.push(...(await ollamaEmbed(texts.slice(i, i + OLLAMA_BATCH), 300_000)));
    return vectors;
  }
  for (const batch of batches(texts)) {
    vectors.push(...(await voyageBatch(batch, inputType, MAX_ATTEMPTS)));
  }
  return vectors;
}

/**
 * Groups texts into requests of at most BATCH_SIZE items and ~6K tokens. Accounts without a
 * payment method are capped at 10K tokens per minute, so one oversized batch could never succeed.
 */
function batches(texts: string[]): string[][] {
  const out: string[][] = [];
  let current: string[] = [];
  let chars = 0;
  for (const text of texts) {
    if (current.length && (current.length >= BATCH_SIZE || chars + text.length > MAX_BATCH_CHARS)) {
      out.push(current);
      current = [];
      chars = 0;
    }
    current.push(text);
    chars += text.length;
  }
  if (current.length) out.push(current);
  return out;
}

/**
 * Embeds a search query. A visitor is waiting, so this gives up quickly (instead of queueing
 * behind ingestion's rate-limit backoff) and returns null; callers fall back to keyword search.
 */
export async function embedQuery(text: string): Promise<number[] | null> {
  const mode = embeddingMode();
  if (mode === 'mock') return mockEmbedding(text);
  try {
    const [vector] = mode === 'ollama' ? await ollamaEmbed([text], 20_000) : await voyageBatch([text], 'query', 2);
    return vector;
  } catch (err) {
    console.warn('[embed] query embedding failed, falling back to keyword search:', err instanceof Error ? err.message.slice(0, 120) : err);
    return null;
  }
}

/** Per-request timeout: a hung connection must not stall ingestion or a chat answer. */
const REQUEST_TIMEOUT_MS = 30_000;

async function voyageBatch(input: string[], inputType: InputType, maxAttempts: number): Promise<number[][]> {
  const apiKey = requireEnv('VOYAGE_API_KEY');

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let res: Response;
    try {
      res = await fetch('https://api.voyageai.com/v1/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          input,
          model: VOYAGE_MODEL,
          input_type: inputType,
          output_dimension: EMBEDDING_DIMS,
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (err) {
      // Timeouts and dropped connections are transient.
      if (attempt === maxAttempts) throw err;
      await new Promise((resolve) => setTimeout(resolve, 2_000 * attempt));
      continue;
    }

    if (res.ok) {
      const body = (await res.json()) as VoyageResponse;
      return body.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
    }

    // Free-tier Voyage accounts have very low rate limits; back off and retry.
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt === maxAttempts) {
      throw new Error(`Voyage embeddings failed (${res.status}): ${await res.text()}`);
    }
    const retryAfter = Number(res.headers.get('retry-after'));
    const delayMs = retryAfter > 0 ? retryAfter * 1000 : Math.min(2 ** attempt * 1000, 60_000);
    // Interactive callers (few attempts) must not sit in a long rate-limit wait.
    await new Promise((resolve) => setTimeout(resolve, maxAttempts <= 2 ? Math.min(delayMs, 3_000) : delayMs));
  }

  throw new Error('Voyage embeddings failed after retries.');
}

/** Feature-hashed bag of words, L2-normalised. Deterministic and offline. */
function mockEmbedding(text: string): number[] {
  const vector = new Array<number>(EMBEDDING_DIMS).fill(0);
  const words = text.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? [];
  for (const word of words) {
    let hash = 2166136261;
    for (let i = 0; i < word.length; i++) {
      hash ^= word.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    const index = (hash >>> 0) % EMBEDDING_DIMS;
    vector[index] += hash & 1 ? 1 : -1;
  }
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => v / norm);
}
