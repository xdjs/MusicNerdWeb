import { sql } from 'drizzle-orm';
import { db } from '@/server/db/drizzle';
import { spotifyCooldownKey } from './spotifyCooldownKey';
import { spotifyRetryAt } from './spotifyRetryAt';
import { SpotifyCooldownError } from './SpotifyCooldownError';

/** Gate an actual Spotify request against the shared Web/API credential cooldown. */
export async function runSpotifyRequest<T>(request: () => Promise<T>): Promise<T> {
  const key = spotifyCooldownKey();
  const rows = await db.execute(sql`select blocked_until from provider_request_cooldowns where provider_key=${key}`);
  const deadline = new Date((rows[0] as { blocked_until?: string } | undefined)?.blocked_until ?? '').getTime();
  if (deadline > Date.now()) throw new SpotifyCooldownError(deadline);
  try {
    return await request();
  } catch (error) {
    const response = (error as { response?: { status?: number; headers?: Record<string, unknown> } })?.response;
    if (response?.status !== 429) throw error;
    const retryAtMs = spotifyRetryAt(response.headers?.['retry-after'], Date.now());
    await db.execute(sql`insert into provider_request_cooldowns(provider_key,blocked_until,updated_at)
      values(${key},${new Date(retryAtMs).toISOString()}::timestamptz,now())
      on conflict(provider_key) do update set blocked_until=greatest(provider_request_cooldowns.blocked_until,excluded.blocked_until),updated_at=now()`);
    throw new SpotifyCooldownError(retryAtMs);
  }
}
