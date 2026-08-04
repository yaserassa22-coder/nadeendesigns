/**
 * Simple in-memory rate limiter for guest APIs (per process).
 * Not distributed — adequate for boutique traffic + soft abuse protection.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function rateLimitGuest(
  key: string,
  limit: number,
  windowMs: number
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (bucket.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  bucket.count += 1;
  return { ok: true };
}

/** Best-effort client key from request (IP + guest). */
export function guestRateKey(
  prefix: string,
  ip: string | null,
  guestId?: string | null
): string {
  return `${prefix}:${ip || "unknown"}:${guestId || "-"}`;
}
