import 'server-only';
import type * as z from 'zod/v4';
import { CLAUDE_MODELS, claudeStructured } from './claude';
import { geminiModel, geminiStructured } from './gemini';
import { ollamaModel, ollamaStructured } from './ollama';
import type { ModelTier, StructuredRequest, StructuredResult } from './types';

export { addUsage, AIOutputError } from './types';
export type { LLMContent, LLMPart, ModelTier, TokenUsage } from './types';

export type AIProvider = 'ollama' | 'gemini' | 'claude';

/**
 * AI_PROVIDER=ollama | gemini | claude. Everything in lib/ai goes through this file.
 * ollama = open-weight models on our own hardware (the open-source production path);
 * gemini = free hosted tier for demos; claude = optional paid provider.
 */
export function aiProvider(): AIProvider {
  const value = process.env.AI_PROVIDER;
  return value === 'ollama' || value === 'gemini' ? value : 'claude';
}

export function modelName(tier: ModelTier): string {
  switch (aiProvider()) {
    case 'ollama':
      return ollamaModel(tier);
    case 'gemini':
      return geminiModel(tier);
    default:
      return CLAUDE_MODELS[tier];
  }
}

/** One model call whose output is constrained to `schema` and validated with Zod. */
export function generateStructured<S extends z.ZodType>(request: StructuredRequest<S>): Promise<StructuredResult<z.infer<S>>> {
  switch (aiProvider()) {
    case 'ollama':
      return ollamaStructured(request);
    case 'gemini':
      return geminiStructured(request);
    default:
      return claudeStructured(request);
  }
}
