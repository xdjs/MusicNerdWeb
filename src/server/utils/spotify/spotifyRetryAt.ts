/** Honor seconds and HTTP dates. Never shorten an explicit provider deadline. */
export function spotifyRetryAt(value: unknown, now: number): number {
  const text = typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
  const seconds = /^\d+(?:\.\d+)?$/.test(text) ? Number(text) : NaN;
  const parsed = Number.isFinite(seconds) ? now + seconds * 1000 : Date.parse(text);
  return Number.isFinite(parsed) && parsed > now ? parsed : now + 60_000;
}
