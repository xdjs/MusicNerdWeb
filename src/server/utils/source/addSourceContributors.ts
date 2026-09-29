import { sql } from 'drizzle-orm';
import { db } from '@/server/db/drizzle';
import type { ArtistVaultSource } from '@/server/db/DbTypes';

/** Private editor projection. Call only after the live artist-owner/admin check. */
export async function addSourceContributors(artistId: string, sources: ArtistVaultSource[]): Promise<ArtistVaultSource[]> {
  const ids = [...new Set(sources.filter(s => s.artistId === artistId &&
    (s.origin === 'submission' || s.origin === 'upload')).map(s => s.activityId).filter((id): id is string => !!id))];
  const names = new Map<string, string>();
  if (ids.length) {
    const rows = await db.execute(sql`
      select e.id, u.username from artist_activity_events e
      join users u on u.id = e.actor_user_id
      where e.artist_id = ${artistId}::uuid and e.actor_kind = 'user'
        and u.is_hidden = false and e.id in (${sql.join(ids.map(id => sql`${id}::uuid`), sql`, `)})
    `);
    for (const row of rows) {
      const name = typeof row.username === 'string' ? row.username.trim() : '';
      if (name) names.set(String(row.id), name);
    }
  }
  return sources.map(source => ({ ...source, contributorName:
    source.artistId === artistId && (source.origin === 'submission' || source.origin === 'upload')
      ? names.get(source.activityId ?? '') ?? null : null }));
}
