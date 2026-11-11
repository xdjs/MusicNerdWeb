import { sql } from 'drizzle-orm';
import { db } from '@/server/db/drizzle';
import { spotifyCooldownKey } from './spotifyCooldownKey';
import { spotifyRetryAt } from './spotifyRetryAt';
import { SpotifyCooldownError } from './SpotifyCooldownError';
import { observedSpotifyCooldowns } from './spotifyCooldownState';

// Only positive deadlines are retained. Cold starts and expiry always consult
// the shared row, so another worker's extension cannot allow an early request.
const pendingReads = new Map<string, Promise<number>>();

/** Gate an actual Spotify request against the shared Web/API credential cooldown. */
export async function runSpotifyRequest<T>(request: () => Promise<T>): Promise<T> {
  const key = spotifyCooldownKey();
  const observed = observedSpotifyCooldowns.get(key) ?? 0;
  if (observed > Date.now()) throw new SpotifyCooldownError(observed);
  observedSpotifyCooldowns.delete(key);

  let pending = pendingReads.get(key);
  if (!pending) {
    pending = Promise.resolve(db.execute(sql`select blocked_until from provider_request_cooldowns where provider_key=${key}`))
      .then(rows => {
        const deadline = new Date((rows[0] as { blocked_until?: string } | undefined)?.blocked_until ?? '').getTime();
        return Number.isFinite(deadline) ? deadline : 0;
      })
      .finally(() => pendingReads.delete(key));
    pendingReads.set(key, pending);
  }
  // A concurrent actual 429 may have established a deadline while this read ran.
  const deadline = Math.max(await pending, observedSpotifyCooldowns.get(key) ?? 0);
  if (deadline > Date.now()) {
    observedSpotifyCooldowns.set(key, deadline);
    throw new SpotifyCooldownError(deadline);
  }
  try {
    return await request();
  } catch (error) {
    const response = (error as { response?: { status?: number; headers?: Record<string, unknown> } })?.response;
    if (response?.status !== 429) throw error;
    const retryAtMs = spotifyRetryAt(response.headers?.['retry-after'], Date.now());
    observedSpotifyCooldowns.set(key, Math.max(observedSpotifyCooldowns.get(key) ?? 0, retryAtMs));
    await db.execute(sql`insert into provider_request_cooldowns(provider_key,blocked_until,updated_at)
      values(${key},${new Date(retryAtMs).toISOString()}::timestamptz,now())
      on conflict(provider_key) do update set blocked_until=greatest(provider_request_cooldowns.blocked_until,excluded.blocked_until),updated_at=now()`);
    throw new SpotifyCooldownError(retryAtMs);
  }
}
