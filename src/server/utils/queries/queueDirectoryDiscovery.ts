import { sql } from 'drizzle-orm';
import type { db } from '@/server/db/drizzle';

/** Queue once inside the successful new-artist transaction; an adder is not an editor. */
export async function queueDirectoryDiscovery(writer: Pick<typeof db, 'execute'>, artistId: string, userId: string): Promise<void> {
  await writer.execute(sql`
    with initiating_event as (
      insert into artist_activity_events (artist_id, actor_user_id, actor_kind, action, trigger)
      values (${artistId}::uuid, ${userId}::uuid, 'user', 'directory_add', 'directory_add')
      returning id
    )
    insert into artist_research_jobs (artist_id, kind, status, activity_id, state)
    select ${artistId}::uuid, 'source_search', 'pending', id,
      jsonb_build_object('claimId', null, 'purpose', 'directory_preparation', 'creationActivityId', id)
    from initiating_event
  `);
}
