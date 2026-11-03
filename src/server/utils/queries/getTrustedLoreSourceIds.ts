import { sql } from "drizzle-orm";
import { db } from "@/server/db/drizzle";
/** Server-verified immutable submission evidence, never a client-provided trust flag. */
export async function getTrustedLoreSourceIds(
  artistId: string,
): Promise<Set<string>> {
  const rows = await db.execute(sql`select v.id from artist_vault_sources v
  join artist_activity_events e on e.id=v.activity_id and e.artist_id=v.artist_id and e.source_id=v.id
  where v.artist_id=${artistId}::uuid and v.status='approved' and v.publication='inherit'
  and e.actor_kind='user' and e.actor_user_id is not null and e.trigger='trusted_submission'
  and ((v.origin='upload' and e.action='source_upload') or (v.origin='submission' and e.action='source_submission'))`);
  return new Set(
    Array.from(rows as unknown as { id: string }[]).map((row) => row.id),
  );
}
