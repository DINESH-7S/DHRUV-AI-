import type * as z from 'zod/v4';

/** smart: summaries, campaigns, lessons, RAG answers. fast: tagging, captions, classification. */
export type ModelTier = 'smart' | 'fast';

/** Provider-neutral message content. Each provider adapter converts it to its own format. */
export type LLMPart =
  | { type: 'text'; text: string }
  | { type: 'image'; mediaType: 'image/jpeg' | 'image/png' | 'image/webp'; data: string }
  | { type: 'pdf'; data: string }
  /**
   * A public YouTube video. Only Gemini can watch it; other providers receive the URL as text.
   * endSec limits how much of a long recording is analysed (free-tier token and daily limits).
   */
  | { type: 'youtube'; url: string; endSec?: number };

export type LLMContent = string | LLMPart[];

export interface StructuredRequest<S extends z.ZodType> {
  tier: ModelTier;
  system: string;
  content: LLMContent;
  schema: S;
  maxTokens?: number;
  /** Background work (ingestion) can wait longer for an overloaded provider than a user can. */
  patient?: boolean;
  /** Per-request timeout override for very large inputs/outputs (e.g. reading a 170-page scan). */
  timeoutMs?: number;
}

export interface TokenUsage {
  input: number;
  output: number;
}

export interface StructuredResult<T> {
  data: T;
  usage: TokenUsage;
  model: string;
}

export class AIOutputError extends Error {}

export function addUsage(total: TokenUsage, usage: TokenUsage): void {
  total.input += usage.input;
  total.output += usage.output;
}
