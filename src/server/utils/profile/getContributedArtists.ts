import { db } from '@/server/db/drizzle';
import { artists, artistSelfEdits, ugcresearch } from '@/server/db/schema';
import { and, asc, count, eq, exists, ilike, or, sql } from 'drizzle-orm';

/** Session-owned artist set shared by the collection and bounded update feed. */
export async function getContributedArtists(userId: string, {offset, limit, query = ''}: {offset: number; limit: number; query?: string}) {
  const eligible = or(
    eq(artists.addedBy, userId),
    exists(db.select({id: ugcresearch.id}).from(ugcresearch).where(and(eq(ugcresearch.artistId, artists.id), eq(ugcresearch.userId, userId), eq(ugcresearch.accepted, true)))),
    exists(db.select({id: artistSelfEdits.id}).from(artistSelfEdits).where(and(eq(artistSelfEdits.artistId, artists.id), eq(artistSelfEdits.userId, userId)))),
  );
  const condition = and(eligible, query ? ilike(artists.name, `%${query.replace(/[\\%_]/g, '\\$&')}%`) : undefined);
  const [rows, totals] = await Promise.all([
    db.select().from(artists).where(condition).orderBy(asc(sql`lower(${artists.name})`), asc(artists.id)).limit(limit).offset(offset),
    db.select({total: count()}).from(artists).where(condition),
  ]);
  return {artists: rows, total: totals[0]?.total ?? 0};
}
