import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { isGeminiApiError, isGeminiAuthError, isGeminiRateLimit } from './ai/gemini';
import { AIOutputError } from './ai/types';
import { AuthError } from './db/auth';

export function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

/** Maps thrown errors to JSON responses with a message the UI can show. */
export function handleApiError(err: unknown, context: string) {
  if (err instanceof AuthError) return fail(err.message, err.status);
  if (err instanceof AIOutputError) return fail(err.message, 502);
  if (err instanceof Anthropic.RateLimitError || isGeminiRateLimit(err)) {
    return fail('The AI service is busy (rate limit). Wait a minute and try again.', 503);
  }
  if (err instanceof Anthropic.AuthenticationError) return fail('The Anthropic API key is missing or invalid. Check ANTHROPIC_API_KEY.', 503);
  if (isGeminiAuthError(err)) return fail('The Gemini API key is missing or invalid. Check GEMINI_API_KEY.', 503);
  if (err instanceof Anthropic.APIError || isGeminiApiError(err)) {
    console.error(`[${context}]`, err);
    return fail(`AI service error (${err.status}). Try again.`, 502);
  }
  console.error(`[${context}]`, err);
  return fail(err instanceof Error ? err.message : 'Unexpected error.', 500);
}
