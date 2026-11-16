/** Daily Orbit rolls over at 00:00 UTC for every player worldwide. */

const DAY_MS = 86_400_000;

/** YYYY-MM-DD key for the UTC day containing `at`. */
export function utcDayKey(at: Date | number): string {
  return new Date(at).toISOString().slice(0, 10);
}

export function msUntilNextUtcDay(now: number): number {
  const next = Math.floor(now / DAY_MS) * DAY_MS + DAY_MS;
  return next - now;
}

/** HH:MM:SS, clamped at zero. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}
