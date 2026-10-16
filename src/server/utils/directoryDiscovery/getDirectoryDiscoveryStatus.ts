import { and, eq, sql } from "drizzle-orm";
import { db } from "@/server/db/drizzle";
import { artists, artistVaultSources } from "@/server/db/schema";
import { getArtistLinks } from "@/server/utils/queries/artistQueries";
import { getConflictingMusicSourceIds } from "@/server/utils/musicLinks/getConflictingMusicSourceIds";
import { getHiddenLinkSourceIds } from "@/server/utils/artistLinkReview/getHiddenLinkSourceIds";
import { publicLinkRevision } from "./publicLinkRevision";

export type DirectoryDiscoveryStatus = {
  state: "active" | "complete" | "failed" | "stopped";
  revision: string;
};

/** Private read authorization, public-only projection. Never advances or creates work. */
export async function getDirectoryDiscoveryStatus(
  artistId: string,
  userId: string,
): Promise<DirectoryDiscoveryStatus | null> {
  const rows = await db.execute(sql`
    select case
      when exists(select 1 from artist_claims c where c.artist_id=a.id) then 'stopped'
      when directory_jobs.active or directory_jobs.awaiting_handoff then 'active'
      when directory_jobs.unfinished then 'failed'
      else 'complete' end as state
    from artists a
    join users viewer on viewer.id=${userId}::uuid
    join artist_activity_events creation on creation.artist_id=a.id
      and creation.action='directory_add' and creation.trigger='directory_add'
      and creation.actor_kind='user' and creation.actor_user_id=a.added_by
    join artist_research_jobs parent on parent.artist_id=a.id and parent.activity_id=creation.id
      and parent.kind='source_search' and parent.state->>'purpose'='directory_preparation'
      and parent.state->>'creationActivityId'=creation.id::text
    cross join lateral (
      select bool_or(j.status in ('pending','running','queued') and j.attempts < 4) as active,
        bool_or(j.status <> 'done') as unfinished,
        bool_or(j.kind='social_ingest' and j.status='done' and not exists (
          select 1 from artist_research_jobs child where child.artist_id=a.id
            and child.kind='caption_extract'
            and child.state->>'directoryActivityId'=creation.id::text
        )) as awaiting_handoff
      from artist_research_jobs j
      left join artist_activity_events activity on activity.id=j.activity_id
      where j.artist_id=a.id and j.kind in ('source_search','lore_refresh','social_ingest','caption_extract','source_extract')
        and (j.activity_id=creation.id or activity.parent_activity_id=creation.id
          or j.state->>'directoryActivityId'=creation.id::text
          or j.state->>'creationActivityId'=creation.id::text)
    ) directory_jobs
    where a.id=${artistId}::uuid and a.created_at > now()-interval '24 hours'
      and a.created_at <= now() and (viewer.is_admin or creation.actor_user_id=viewer.id)
    limit 1
  `);
  const state = rows[0]?.state;
  if (state === undefined) return null;
  if (!["active", "complete", "failed", "stopped"].includes(String(state)))
    throw new Error("Invalid discovery status");
  // Read destinations after status: a final worker write cannot be skipped when it finishes.
  const artist = await db.query.artists.findFirst({
    where: eq(artists.id, artistId),
  });
  if (!artist) return null;
  const sources = await db.query.artistVaultSources.findMany({
    columns: {
      id: true,
      url: true,
      type: true,
      status: true,
      podcastEpisodeKey: true,
      filePath: true,
    },
    where: and(
      eq(artistVaultSources.artistId, artistId),
      eq(artistVaultSources.status, "approved"),
    ),
    orderBy: (sources, { desc }) => [desc(sources.createdAt)],
  });
  const [links, conflicts, hidden] = await Promise.all([
    getArtistLinks(artist),
    getConflictingMusicSourceIds(artistId, sources),
    getHiddenLinkSourceIds(artistId),
  ]);
  return {
    state: state as DirectoryDiscoveryStatus["state"],
    revision: publicLinkRevision(artist, links, sources, [
      ...conflicts,
      ...hidden,
    ]),
  };
}
