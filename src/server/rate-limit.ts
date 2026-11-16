import "server-only";

/**
 * Fixed-window rate limiter, per server instance. On multi-instance hosting
 * the effective limit is per instance; use a shared store (e.g. Upstash or a
 * Postgres function) for strict global limits.
 */
const g = globalThis as unknown as { __aqRate?: Map<string, { count: number; reset: number }> };
const buckets = (g.__aqRate ??= new Map());

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const b = buckets.get(key);
  if (!b || b.reset <= now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    if (buckets.size > 10_000) {
      for (const [k, v] of buckets) if (v.reset <= now) buckets.delete(k);
    }
    return true;
  }
  b.count++;
  return b.count <= limit;
}
