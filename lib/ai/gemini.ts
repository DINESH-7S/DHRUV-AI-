import 'server-only';
import { ApiError, FileState, GoogleGenAI, MediaResolution, ThinkingLevel, type Part, type ThinkingConfig } from '@google/genai';
import * as z from 'zod/v4';
import { requireEnv } from '../env';
import {
  addUsage,
  AIOutputError,
  type LLMContent,
  type ModelTier,
  type StructuredRequest,
  type StructuredResult,
  type TokenUsage,
} from './types';

// Model ids are overridable because Google renames/retires Gemini models frequently.
export function geminiModel(tier: ModelTier): string {
  return tier === 'smart'
    ? process.env.GEMINI_MODEL_SMART || 'gemini-3.5-flash'
    : process.env.GEMINI_MODEL_FAST || 'gemini-3.5-flash-lite';
}

/**
 * Preferred model first, then fallbacks. Free-tier models regularly return 503 "high demand"
 * or 429 quota errors; falling back keeps uploads and campaigns working during a live demo.
 */
function modelChain(tier: ModelTier): string[] {
  // Lite models close the smart chain: a slightly weaker summary beats a failed upload.
  const fallbacks =
    tier === 'smart'
      ? ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite']
      : ['gemini-3.1-flash-lite', 'gemini-2.5-flash-lite', 'gemini-3.5-flash'];
  const chain = [...new Set([geminiModel(tier), ...fallbacks])];
  // Skip models that recently reported "quota exceeded", unless every model is cooling down.
  const available = chain.filter((m) => (quotaCooldownUntil.get(m) ?? 0) <= Date.now());
  return available.length ? available : chain;
}

/** Free-tier quotas are per model per minute: after a 429, give that model a rest. */
const quotaCooldownUntil = new Map<string, number>();
const QUOTA_COOLDOWN_MS = 60_000;
/** Background jobs (patient requests) retry the whole chain this many times, pausing between rounds. */
const PATIENT_ROUNDS = 3;
const ROUND_PAUSE_MS = 20_000;

/** Low thinking keeps latency demo-friendly. Gemini 2.5 uses a token budget instead of levels, and only lite models accept MINIMAL. */
function thinkingFor(model: string): ThinkingConfig {
  if (model.startsWith('gemini-2.5')) return { thinkingBudget: model.includes('lite') ? 0 : 1024 };
  return { thinkingLevel: model.includes('lite') ? ThinkingLevel.MINIMAL : ThinkingLevel.LOW };
}

/** Attempts per model for transient errors before moving to the next model in the chain. */
const ATTEMPTS_PER_MODEL = 2;
/** A hung request must not block a whole upload or campaign; time out and fall back instead. */
const REQUEST_TIMEOUT_MS = 90_000;

let client: GoogleGenAI | null = null;

function gemini(): GoogleGenAI {
  if (!client) client = new GoogleGenAI({ apiKey: requireEnv('GEMINI_API_KEY') });
  return client;
}

/** Inline request bodies are capped at ~20 MB (after base64); bigger PDFs go through the Files API. */
const INLINE_LIMIT_BYTES = 14 * 1024 * 1024;
const FILE_ACTIVE_TIMEOUT_MS = 120_000;

/** Uploads a large PDF and waits until Gemini has processed it. Returns the file name for cleanup. */
async function uploadPdf(base64: string): Promise<{ part: Part; name: string }> {
  const bytes = Buffer.from(base64, 'base64');
  let file = await gemini().files.upload({
    file: new Blob([bytes], { type: 'application/pdf' }),
    config: { mimeType: 'application/pdf', displayName: `dhruv-${Date.now()}.pdf` },
  });
  const deadline = Date.now() + FILE_ACTIVE_TIMEOUT_MS;
  while (file.state === FileState.PROCESSING && Date.now() < deadline) {
    await sleep(3_000);
    file = await gemini().files.get({ name: file.name! });
  }
  if (file.state !== FileState.ACTIVE || !file.uri) {
    throw new AIOutputError(`Gemini could not process the PDF (state ${file.state ?? 'unknown'}).`);
  }
  return { part: { fileData: { fileUri: file.uri, mimeType: 'application/pdf' } }, name: file.name! };
}

/** Converts neutral content to Gemini parts. Large PDFs are uploaded once and reused across retries. */
async function prepareParts(content: LLMContent): Promise<{ parts: Part[]; uploaded: string[] }> {
  if (typeof content === 'string') return { parts: [{ text: content }], uploaded: [] };
  const uploaded: string[] = [];
  const parts: Part[] = [];
  for (const part of content) {
    switch (part.type) {
      case 'text':
        parts.push({ text: part.text });
        break;
      case 'image':
        parts.push({ inlineData: { mimeType: part.mediaType, data: part.data } });
        break;
      case 'pdf':
        if (part.data.length * 0.75 > INLINE_LIMIT_BYTES) {
          const { part: filePart, name } = await uploadPdf(part.data);
          uploaded.push(name);
          parts.push(filePart);
        } else {
          parts.push({ inlineData: { mimeType: 'application/pdf', data: part.data } });
        }
        break;
      case 'youtube':
        // Gemini watches public YouTube videos by URL. One frame every 4 s plus the audio track is
        // enough for summaries and chapters, and keeps a 40-minute film near 100k tokens.
        parts.push({
          fileData: { fileUri: part.url },
          videoMetadata: { fps: 0.25, ...(part.endSec ? { startOffset: '0s', endOffset: `${part.endSec}s` } : {}) },
        });
        break;
    }
  }
  return { parts, uploaded };
}

/** Zod → JSON Schema in the subset Gemini's responseJsonSchema accepts. */
function toGeminiSchema(schema: z.ZodType): unknown {
  const { $schema: _ignored, ...jsonSchema } = z.toJSONSchema(schema) as Record<string, unknown>;
  return jsonSchema;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Rate limits, overload, server errors, and dropped connections ("fetch failed") are all transient. */
function isTransient(err: unknown): boolean {
  if (err instanceof TypeError && /fetch failed/i.test(err.message)) return true;
  if (
    err instanceof Error &&
    (err.name === 'AbortError' || err.name === 'TimeoutError' || /timed? ?out|aborted/i.test(err.message))
  )
    return true;
  return err instanceof ApiError && (err.status === 429 || err.status >= 500);
}

/**
 * One Gemini call with JSON-schema-constrained output, validated with Zod.
 * Transient errors retry, then fall back to the next model; invalid output retries once.
 */
export async function geminiStructured<S extends z.ZodType>(
  request: StructuredRequest<S>,
): Promise<StructuredResult<z.infer<S>>> {
  const usage: TokenUsage = { input: 0, output: 0 };
  const responseJsonSchema = toGeminiSchema(request.schema);
  const { parts, uploaded } = await prepareParts(request.content);
  const hasVideo = parts.some((p) => p.videoMetadata);
  try {
    return await runChain(request, parts, responseJsonSchema, usage, hasVideo);
  } finally {
    // Uploaded files would otherwise sit in the project's Gemini storage for 48 hours.
    await Promise.all(uploaded.map((name) => gemini().files.delete({ name }).catch(() => undefined)));
  }
}

async function runChain<S extends z.ZodType>(
  request: StructuredRequest<S>,
  parts: Part[],
  responseJsonSchema: unknown,
  usage: TokenUsage,
  hasVideo = false,
): Promise<StructuredResult<z.infer<S>>> {
  let lastProblem = '';
  let lastError: unknown = null;
  let validationRetries = 0;

  const rounds = request.patient ? PATIENT_ROUNDS : 1;
  for (let round = 0; round < rounds; round++) {
    if (round > 0) {
      console.warn(`[gemini] all models busy; waiting ${(ROUND_PAUSE_MS * round) / 1000}s before round ${round + 1}/${rounds}`);
      await sleep(ROUND_PAUSE_MS * round);
    }
    for (const model of modelChain(request.tier)) {
      for (let attempt = 0; attempt < ATTEMPTS_PER_MODEL; attempt++) {
        let response;
        try {
          response = await gemini().models.generateContent({
            model,
            contents: [{ role: 'user', parts }],
            config: {
              systemInstruction: request.system,
              responseMimeType: 'application/json',
              responseJsonSchema,
              maxOutputTokens: request.maxTokens ?? 16000,
              thinkingConfig: thinkingFor(model),
              // Low resolution: 66 instead of 258 tokens per video frame; plenty for scene-level understanding.
              ...(hasVideo ? { mediaResolution: MediaResolution.MEDIA_RESOLUTION_LOW } : {}),
              httpOptions: { timeout: request.timeoutMs ?? REQUEST_TIMEOUT_MS },
            },
          });
        } catch (err) {
          if (!isTransient(err)) throw err;
          lastError = err;
          console.warn(
            `[gemini] ${model} attempt ${attempt + 1} failed:`,
            err instanceof Error ? err.message.slice(0, 120) : err,
          );
          if (isGeminiRateLimit(err)) {
            // Retrying a quota error on the same model is pointless; rest it and move on.
            quotaCooldownUntil.set(model, Date.now() + QUOTA_COOLDOWN_MS);
            break;
          }
          if (attempt + 1 < ATTEMPTS_PER_MODEL) await sleep(4_000 * (attempt + 1));
          continue;
        }

        const meta = response.usageMetadata;
        addUsage(usage, {
          input: meta?.promptTokenCount ?? 0,
          output: (meta?.candidatesTokenCount ?? 0) + (meta?.thoughtsTokenCount ?? 0),
        });

        const finish = response.candidates?.[0]?.finishReason;
        if (finish === 'SAFETY' || finish === 'PROHIBITED_CONTENT' || response.promptFeedback?.blockReason) {
          throw new AIOutputError('Gemini declined this request (safety filter).');
        }

        const text = response.text;
        if (text) {
          try {
            const parsed = request.schema.safeParse(JSON.parse(text));
            if (parsed.success) return { data: parsed.data as z.infer<S>, usage, model };
            lastProblem = 'the response did not match the expected schema';
          } catch {
            lastProblem = finish === 'MAX_TOKENS' ? 'the response hit the max output limit' : 'the response was not valid JSON';
          }
        } else {
          lastProblem = `no text was returned (finish reason ${finish ?? 'unknown'})`;
        }

        if (++validationRetries > 1) throw new AIOutputError(`Gemini output was unusable: ${lastProblem}.`);
      }
    }
  }

  // Every model in the chain was overloaded or rate-limited.
  if (lastError) throw lastError;
  throw new AIOutputError(`Gemini output was unusable: ${lastProblem || 'no model responded'}.`);
}

export function isGeminiRateLimit(err: unknown): boolean {
  return err instanceof ApiError && err.status === 429;
}

export function isGeminiAuthError(err: unknown): boolean {
  return (
    err instanceof ApiError && (err.status === 401 || err.status === 403 || (err.status === 400 && /API key/i.test(err.message)))
  );
}

export function isGeminiApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}
