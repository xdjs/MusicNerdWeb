import { sql } from 'drizzle-orm';
import { db } from '@/server/db/drizzle';
/** Visibility is separate from approval, so removing an icon retains its Lore evidence. */
export async function getHiddenLinkSourceIds(artistId: string): Promise<string[]> {
  const rows = await db.execute(sql`select source_id from (
    select distinct on (source_id) source_id,action from artist_activity_events
    where artist_id=${artistId}::uuid and action in ('link_hidden','link_shown','source_approved')
    order by source_id,created_at desc,id desc
  ) latest where action='link_hidden'`);
  return rows.map(row => String(row.source_id));
}
