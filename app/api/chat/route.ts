import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import * as z from 'zod/v4';
import { answerQuestion } from '@/lib/ai/chat';
import type { TokenUsage } from '@/lib/ai/llm';
import { fail } from '@/lib/api';
import { findSavedAnswer } from '@/lib/ai/saved-answers';
import { AuthError } from '@/lib/db/auth';
import { supabaseAdmin } from '@/lib/db/admin';
import { createSupabaseServerClient } from '@/lib/db/server';
import { isDbConfigured } from '@/lib/env';
import { clientKey, rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 120;

const ChatBody = z.object({
  question: z.string().trim().min(3, 'Ask a longer question.').max(500, 'Keep questions under 500 characters.'),
  locale: z.enum(['en', 'hi']).default('en'),
  sessionId: z.string().max(64).optional(),
  /** Skip the saved answer and ask the live AI ("Ask the live AI" on a saved answer). */
  live: z.boolean().optional(),
});

/** Shown instead of a technical error, with the sample questions (which always work) under it. */
const BUSY: Record<'en' | 'hi', string> = {
  en: "Dhruv couldn't answer just now: its free AI service is busy or needs a minute to refill. Please try again shortly, or tap a sample question below: those answers are saved and always work.",
  hi: 'ध्रुव अभी उत्तर नहीं दे सका: इसकी मुफ़्त AI सेवा व्यस्त है या उसे फिर से भरने में एक मिनट लगेगा। कृपया थोड़ी देर बाद फिर पूछें, या नीचे दिया कोई नमूना सवाल चुनें: उनके उत्तर सहेजे गए हैं और हमेशा काम करते हैं।',
};

async function logChat(sessionId: string | undefined, question: string, answer: string, assetIds: (string | null)[]) {
  await supabaseAdmin().from('chat_logs').insert({ session_id: sessionId ?? randomUUID(), question, answer, cited_asset_ids: assetIds });
}

/** POST { question, locale } → { answer, citations: [{ n, asset_id, title }], engine, saved? }. Public. */
export async function POST(req: Request) {
  let locale: 'en' | 'hi' = 'en';
  try {
    if (!isDbConfigured()) return fail('Supabase is not configured yet.', 503);

    const parsed = ChatBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail(parsed.error.issues.map((i) => i.message).join(' '), 400);
    const { question } = parsed.data;
    locale = parsed.data.locale;

    // The sample questions have saved answers: instant, and they work even when the AI allowance runs out.
    const saved = parsed.data.live ? null : findSavedAnswer(question, locale);
    if (saved) {
      await logChat(parsed.data.sessionId, question, saved.answer, saved.citations.map((c) => c.asset_id));
      return NextResponse.json(saved);
    }

    const wait = rateLimit(`chat:${clientKey(req, null)}`, 20, 10 * 60 * 1000);
    if (wait) return NextResponse.json({ error: BUSY[locale], busy: true }, { status: 429 });

    // Viewer's own RLS-bound client: the public can only retrieve published, public content.
    const client = await createSupabaseServerClient();
    const usage: TokenUsage = { input: 0, output: 0 };
    const result = await answerQuestion(client, question, locale, usage);

    await logChat(parsed.data.sessionId, question, result.answer, result.citations.map((c) => c.asset_id));
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AuthError) return fail(err.message, err.status);
    // A public page never shows a raw AI or database error: say it plainly and point to the samples.
    console.error('[api/chat]', err);
    return NextResponse.json({ error: BUSY[locale], busy: true }, { status: 503 });
  }
}
