import { sql } from 'drizzle-orm';
import { db } from '@/server/db/drizzle';

/**
 * Tell the API to re-read an artist's page text after a vault source changed
 * status or publication. The API cannot see Web writes, so this queues the
 * `unit_sync` job (or flags a live one to look again from the top).
 *
 * Call after the write's transaction commits. It never throws: until the
 * migration that allows the `unit_sync` kind is applied the insert fails the
 * kind CHECK, and that must not fail an approval. Resolves true when a new row
 * was inserted, false on conflict (rescan flagged) or on a swallowed error.
 */
export async function queueUnitSync(artistId: string): Promise<boolean> {
  try {
    const rows = await db.execute(sql`
      insert into artist_research_jobs (artist_id, kind, status, state)
      values (${artistId}::uuid, 'unit_sync', 'pending', '{}'::jsonb)
      on conflict (artist_id, kind) where status in ('pending','running')
      do update set state = coalesce(artist_research_jobs.state, '{}'::jsonb) || '{"rescan":true}'::jsonb
      returning (xmax = 0) as inserted`);
    return Boolean((rows as unknown as Array<{ inserted?: boolean }>)[0]?.inserted);
  } catch {
    // Name only the artist: the error text can carry connection or schema detail.
    console.warn(`[queueUnitSync] Could not queue a unit sync for artist ${artistId}`);
    return false;
  }
}
