import { sql } from 'drizzle-orm';
import { db } from '@/server/db/drizzle';
import { parseMusicDestination } from '@/lib/musicLinks/parseMusicDestination';
import { isMusicSource } from '@/lib/musicLinks/isMusicSource';

/** Suppress reviewed legacy catalog profiles that conflict with saved identity decisions. */
export async function getConflictingMusicSourceIds(
  artistId: string,
  sources: {id: string; url: string; type?: string | null; podcastEpisodeKey?: string | null}[],
): Promise<string[]> {
  const candidates = sources.flatMap(source => {
    const destination = parseMusicDestination(source.url);
    return destination?.kind === 'artist' && isMusicSource(source)
      ? [{id:source.id,platform:destination.platform,platform_id:destination.id}]
      : [];
  });
  if (!candidates.length) return [];
  try {
    const conflicts = await db.execute(sql`
      with candidates as (
        select * from jsonb_to_recordset(${JSON.stringify(candidates)}::jsonb)
          as candidate(id text, platform text, platform_id text)
      )
      select candidate.id from candidates candidate
      where exists (
        select 1 from artist_id_mappings mapping
        where mapping.platform = candidate.platform and (
          (mapping.artist_id = ${artistId}::uuid and mapping.platform_id <> candidate.platform_id)
          or (mapping.artist_id <> ${artistId}::uuid and mapping.platform_id = candidate.platform_id)
        )
      ) or exists (
        select 1 from artist_mapping_exclusions exclusion
        where exclusion.artist_id = ${artistId}::uuid and exclusion.platform = candidate.platform
      )
    `);
    return (conflicts as unknown as {id:string}[]).map(row => row.id);
  } catch {
    // A failed identity read must not promote an unverified profile into Listen.
    console.warn('[musicLinks] Identity decisions unavailable; source artist profiles hidden.');
    return candidates.map(candidate => candidate.id);
  }
}
