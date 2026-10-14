import { sql } from 'drizzle-orm';
import { db } from '@/server/db/drizzle';

/** Mirrors API completed-discovery eligibility; human review does not invalidate discovery. */
export async function hasReusableDirectoryDiscovery(
  artistId: string,
  claimId: string,
  reader: Pick<typeof db, 'execute'> = db,
): Promise<boolean> {
  const result = await reader.execute(sql`
    select j.id
    from artists a
    join artist_activity_events e on e.artist_id=a.id
    join artist_research_jobs j on j.artist_id=a.id and j.activity_id=e.id
    where a.id=${artistId}::uuid
      and exists(select 1 from artist_claims c where c.id=${claimId}::uuid and c.artist_id=a.id and c.status='approved')
      and e.actor_kind='user' and e.action='directory_add' and e.trigger='directory_add'
      and e.actor_user_id=a.added_by
      and j.kind='source_search' and j.status='done'
      and j.state->'claimId'='null'::jsonb
      and j.state->>'purpose'='directory_preparation'
      and j.state->>'creationActivityId'=e.id::text
      and j.state->'directoryDiscovery'->'version'='1'::jsonb
      and j.updated_at between now()-interval '24 hours' and now()
      and j.state->'directoryDiscovery'->'identity'=jsonb_build_object('name',a.name,'spotify',a.spotify,'deezer',a.deezer)
      and j.state->'directoryDiscovery'->>'sourcesRevision'=(
        select md5(coalesce(jsonb_agg(public.knowledge_vault_source_snapshot(v)-'status'-'updatedAt' order by v.id),'[]'::jsonb)::text)
        from artist_vault_sources v where v.artist_id=a.id and v.activity_id=e.id and v.origin='research'
      )
    limit 1;
  `);
  const rows = Array.isArray(result) ? result : (result as { rows?: unknown[] }).rows;
  return !!rows?.length;
}
