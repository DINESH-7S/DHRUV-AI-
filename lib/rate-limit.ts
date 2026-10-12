import 'server-only';

// Simple in-memory sliding window, per server instance. Good enough to stop accidental
// button-mashing from burning API credits during the prototype; not a security boundary.
const hits = new Map<string, number[]>();

/** Returns seconds to wait if `key` exceeded `limit` calls in `windowMs`, otherwise 0 (and records the call). */
export function rateLimit(key: string, limit: number, windowMs: number): number {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return Math.ceil((windowMs - (now - recent[0])) / 1000);
  }
  recent.push(now);
  hits.set(key, recent);
  return 0;
}

export function clientKey(req: Request, userId: string | null): string {
  return userId ?? req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'anonymous';
}
