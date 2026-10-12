import { NextResponse } from 'next/server';
import * as z from 'zod/v4';
import { draftBrief } from '@/lib/ai/brief';
import type { TokenUsage } from '@/lib/ai/llm';
import { fail, handleApiError } from '@/lib/api';
import { requireRole, STAFF_ROLES } from '@/lib/db/auth';
import { clientKey, rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 60;

const Body = z.object({ questions: z.array(z.string().trim().min(3).max(500)).min(1).max(10) });

/** POST { questions[] } → a content brief for an explainer. Staff only; nothing is saved or published. */
export async function POST(req: Request) {
  try {
    const user = await requireRole(STAFF_ROLES);
    const wait = rateLimit(`brief:${clientKey(req, user.id)}`, 10, 10 * 60 * 1000);
    if (wait) return fail(`Too many briefs at once. Try again in ${wait}s.`, 429);
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail('Body must be { "questions": ["..."] }.', 400);
    const usage: TokenUsage = { input: 0, output: 0 };
    return NextResponse.json(await draftBrief(parsed.data.questions, usage));
  } catch (err) {
    return handleApiError(err, 'api/insights/brief');
  }
}
