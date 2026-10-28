import { sql } from 'drizzle-orm';
import type { db } from '@/server/db/drizzle';

/** Queue source research and attach creation lineage to database-scheduled catalog work; retain legacy matching only during rollout. */
export async function queueDirectoryDiscovery(writer: Pick<typeof db, 'execute'>, artistId: string, userId: string): Promise<void> {
  await writer.execute(sql`
    with initiating_event as (
      insert into artist_activity_events (artist_id, actor_user_id, actor_kind, action, trigger)
      values (${artistId}::uuid, ${userId}::uuid, 'user', 'directory_add', 'directory_add')
      returning id
    ), directory_job as (
    insert into artist_research_jobs (artist_id, kind, status, activity_id, state)
    select ${artistId}::uuid, 'source_search', 'pending', id,
      jsonb_build_object('claimId', null, 'purpose', 'directory_preparation', 'creationActivityId', id)
    from initiating_event
    returning activity_id, artist_id
    ), catalog_job as (
      update artist_research_jobs counterpart set activity_id=d.activity_id
      from directory_job d where counterpart.artist_id=d.artist_id
        and counterpart.kind='catalog_match' and counterpart.activity_id is null
      returning counterpart.id
    )
    insert into artist_research_jobs (artist_id, kind, status, activity_id, state)
    select a.id, 'spotify_match', 'pending', d.activity_id,
      jsonb_build_object('version',1,'purpose','spotify_identity','deezerId',a.deezer,'artistName',a.name,
        'creationActivityId',d.activity_id,'directoryActivityId',d.activity_id,
        'expiresAtMs',floor(extract(epoch from (now()+interval '7 days'))*1000))
    from artists a cross join directory_job d
    where not exists(select 1 from artist_research_jobs counterpart where counterpart.artist_id=a.id and counterpart.kind='catalog_match')
      and a.id=${artistId}::uuid and nullif(trim(a.deezer),'') is not null and nullif(trim(a.spotify),'') is null
  `);
}
