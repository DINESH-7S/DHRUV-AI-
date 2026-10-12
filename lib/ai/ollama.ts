import 'server-only';
import * as z from 'zod/v4';
import { AIOutputError, type LLMContent, type ModelTier, type StructuredRequest, type StructuredResult } from './types';

/**
 * Open-source AI path: open-weight models served locally by Ollama (MIT), no API keys, no cost.
 *   AI_PROVIDER=ollama
 *   OLLAMA_URL=http://127.0.0.1:11434
 *   OLLAMA_MODEL_SMART / OLLAMA_MODEL_FAST  (default qwen3:4b — Apache-2.0, multilingual incl. Hindi)
 *   OLLAMA_MODEL_VISION                     (default gemma3:4b — open weights under the Gemma terms)
 *   OLLAMA_NUM_CTX                          (default 8192 — fits a 4 GB GPU with a 4B model)
 * Defaults are sized for a 4 GB GPU; a server GPU can run larger models by changing the env only.
 */
const DEFAULT_MODELS = { smart: 'qwen3:4b', fast: 'qwen3:4b', vision: 'gemma3:4b' } as const;

export function ollamaUrl(): string {
  return (process.env.OLLAMA_URL || 'http://127.0.0.1:11434').replace(/\/+$/, '');
}

export function ollamaModel(kind: ModelTier | 'vision'): string {
  const env = { smart: process.env.OLLAMA_MODEL_SMART, fast: process.env.OLLAMA_MODEL_FAST, vision: process.env.OLLAMA_MODEL_VISION }[kind];
  return env || DEFAULT_MODELS[kind];
}

function numCtx(): number {
  return Number(process.env.OLLAMA_NUM_CTX) || 8192;
}

/** ~3.5 characters per token for mixed English/Hindi text; deliberately conservative. */
const CHARS_PER_TOKEN = 3.5;

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  images?: string[];
}

interface OllamaChatResponse {
  message?: { content?: string };
  prompt_eval_count?: number;
  eval_count?: number;
  error?: string;
}

/**
 * Converts neutral content to one user message. Small local models have small context windows:
 * Ollama silently drops the *start* of an oversized prompt, so we trim long text ourselves (keeping
 * the beginning, where titles and abstracts are) and say so in the prompt.
 */
function toUserMessage(content: LLMContent, budgetChars: number): OllamaMessage {
  const parts = typeof content === 'string' ? [{ type: 'text' as const, text: content }] : content;
  const images: string[] = [];
  let text = '';
  for (const part of parts) {
    if (part.type === 'text') text += (text ? '\n\n' : '') + part.text;
    else if (part.type === 'image') images.push(part.data);
    else if (part.type === 'youtube') text += `${text ? '\n\n' : ''}Video link (you cannot watch it; use the metadata only): ${part.url}`;
    else {
      throw new AIOutputError(
        'The open-source model cannot read PDF pages directly. This PDF has no usable text layer; it needs OCR (planned) or a hosted provider.',
      );
    }
  }
  if (text.length > budgetChars) {
    text = `${text.slice(0, budgetChars)}\n\n[Input shortened to fit the local model's context window; the rest of the document was not read.]`;
  }
  return { role: 'user', content: text, ...(images.length ? { images } : {}) };
}

/** Pulls the JSON object out of a reply that may be wrapped in a Markdown fence or <think> block. */
function extractJson(raw: string): unknown {
  const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : cleaned;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  return JSON.parse(start >= 0 && end > start ? body.slice(start, end + 1) : body);
}

async function chat(body: Record<string, unknown>, timeoutMs: number): Promise<OllamaChatResponse> {
  let res: Response;
  try {
    res = await fetch(`${ollamaUrl()}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const reason = err instanceof Error && err.name === 'TimeoutError' ? `timed out after ${Math.round(timeoutMs / 1000)} s` : 'is not reachable';
    throw new AIOutputError(`Ollama at ${ollamaUrl()} ${reason}. Is it running (ollama serve)?`);
  }
  const json = (await res.json().catch(() => ({}))) as OllamaChatResponse;
  if (!res.ok || json.error) {
    const msg = json.error ?? `HTTP ${res.status}`;
    const hint = /not found|pull/i.test(msg) ? ` Run: ollama pull ${String(body.model)}` : '';
    throw new AIOutputError(`Ollama error: ${msg}.${hint}`);
  }
  return json;
}

export async function ollamaStructured<S extends z.ZodType>(request: StructuredRequest<S>): Promise<StructuredResult<z.infer<S>>> {
  const { $schema: _ignored, ...format } = z.toJSONSchema(request.schema) as Record<string, unknown>;
  const maxOutput = Math.min(request.maxTokens ?? 4096, Math.floor(numCtx() / 2));
  const budgetChars = Math.max(2000, Math.floor((numCtx() - maxOutput - 600) * CHARS_PER_TOKEN) - request.system.length);
  const user = toUserMessage(request.content, budgetChars);
  const model = user.images ? ollamaModel('vision') : ollamaModel(request.tier);
  const timeoutMs = request.timeoutMs ?? (request.patient ? 600_000 : 180_000);

  const messages: OllamaMessage[] = [
    { role: 'system', content: `${request.system}\n\nReply with a single JSON object that matches the required schema. No prose.` },
    user,
  ];
  const base = {
    model,
    stream: false,
    format,
    keep_alive: '10m',
    options: { temperature: 0.2, num_ctx: numCtx(), num_predict: maxOutput },
    // Qwen3 is a reasoning model; structured catalogue work does not need visible thinking.
    ...(model.startsWith('qwen3') ? { think: false } : {}),
  };

  const usage = { input: 0, output: 0 };
  let lastProblem = '';
  for (let attempt = 1; attempt <= 2; attempt++) {
    const reply = await chat({ ...base, messages }, timeoutMs);
    usage.input += reply.prompt_eval_count ?? 0;
    usage.output += reply.eval_count ?? 0;
    const raw = reply.message?.content ?? '';
    try {
      const parsed = request.schema.safeParse(extractJson(raw));
      if (parsed.success) return { data: parsed.data, usage, model };
      lastProblem = parsed.error.issues.slice(0, 5).map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ');
    } catch {
      lastProblem = 'the reply was not valid JSON';
    }
    // One repair round: show the model its own output and what was wrong with it.
    messages.push({ role: 'assistant', content: raw.slice(0, 4000) }, { role: 'user', content: `That reply is invalid (${lastProblem}). Return the corrected JSON object only.` });
  }
  throw new AIOutputError(`The local model (${model}) did not return valid structured output: ${lastProblem}.`);
}

/** Embeddings via Ollama's /api/embed (bge-m3 by default: MIT, multilingual, 1024 dimensions). */
export function ollamaEmbeddingModel(): string {
  return process.env.OLLAMA_EMBED_MODEL || 'bge-m3';
}

export async function ollamaEmbed(input: string[], timeoutMs = 120_000): Promise<number[][]> {
  let res: Response;
  try {
    res = await fetch(`${ollamaUrl()}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: ollamaEmbeddingModel(), input, keep_alive: '10m' }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new Error(`Ollama embeddings: ${ollamaUrl()} is not reachable. Is it running (ollama serve)?`);
  }
  const body = (await res.json().catch(() => ({}))) as { embeddings?: number[][]; error?: string };
  if (!res.ok || !body.embeddings) {
    throw new Error(`Ollama embeddings failed: ${body.error ?? `HTTP ${res.status}`}. Run: ollama pull ${ollamaEmbeddingModel()}`);
  }
  return body.embeddings;
}
