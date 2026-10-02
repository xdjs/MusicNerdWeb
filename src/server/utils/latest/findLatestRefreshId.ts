import { sql } from "drizzle-orm";
import { latestRefreshScopeSql } from "./latestRefreshScopeSql";
import type { ScopedWriteDb } from "../queries/ownershipWrites";

/**
 * The artist's live Update Latest request, or the one inside its 30-minute
 * cooldown, still in scope. A new request returns it instead of starting another.
 *
 * @param tx - The transaction holding the artist lock.
 * @param artistId - The artist.
 * @returns The job id, or null.
 */
export async function findLatestRefreshId(tx: ScopedWriteDb, artistId: string): Promise<string | null> {
  const rows = await tx.execute(sql`select j.id from artist_research_jobs j join artists a on a.id=j.artist_id
   where j.artist_id=${artistId}::uuid and j.kind='latest_refresh' and (${latestRefreshScopeSql()})
   and (j.status in ('pending','running') or j.created_at>now()-interval '30 minutes') order by j.created_at desc limit 1`);
  return rows.length ? String(rows[0].id) : null;
}
