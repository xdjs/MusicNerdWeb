import { db } from '@/server/db/drizzle';
import { artists, artistSelfEdits, ugcresearch } from '@/server/db/schema';
import { and, desc, eq, sql } from 'drizzle-orm';

/** All ownership comes from requireAuth at the caller, never query-string IDs. */
export async function getProfileSummary(userId: string) {
  const [stats, entries, added, edited, contributed, addedCount, editCount] = await Promise.all([
    db.select({ totalContributions: sql<number>`count(*)::int`, approved: sql<number>`count(*) filter (where ${ugcresearch.accepted} = true)::int`, pending: sql<number>`count(*) filter (where ${ugcresearch.accepted} = false)::int` }).from(ugcresearch).where(eq(ugcresearch.userId, userId)),
    db.select({ id: ugcresearch.id, artistId: artists.id, artistName: artists.name, imageUrl: artists.customImage, siteName: ugcresearch.siteName, ugcUrl: ugcresearch.ugcUrl, accepted: ugcresearch.accepted, createdAt: ugcresearch.createdAt }).from(ugcresearch).leftJoin(artists, eq(artists.id, ugcresearch.artistId)).where(eq(ugcresearch.userId, userId)).orderBy(desc(ugcresearch.createdAt), desc(ugcresearch.id)).limit(3),
    db.select({ artistId: artists.id, artistName: artists.name, imageUrl: artists.customImage }).from(artists).where(eq(artists.addedBy, userId)).orderBy(desc(artists.createdAt)).limit(12),
    db.select({ artistId: artists.id, artistName: artists.name, imageUrl: artists.customImage }).from(artistSelfEdits).innerJoin(artists, eq(artistSelfEdits.artistId, artists.id)).where(eq(artistSelfEdits.userId, userId)).orderBy(desc(artistSelfEdits.createdAt)).limit(24),
    db.select({ artistId: artists.id, artistName: artists.name, imageUrl: artists.customImage }).from(ugcresearch).innerJoin(artists, eq(ugcresearch.artistId, artists.id)).where(and(eq(ugcresearch.userId, userId), eq(ugcresearch.accepted, true))).orderBy(desc(ugcresearch.createdAt)).limit(24),
    db.select({total: sql<number>`count(*)::int`}).from(artists).where(eq(artists.addedBy, userId)),
    db.select({total: sql<number>`count(*)::int`}).from(artistSelfEdits).where(eq(artistSelfEdits.userId, userId)),
  ]);
  const suggestions = [...added, ...contributed, ...edited].filter((artist, index, all) => all.findIndex(item => item.artistId === artist.artistId) === index).slice(0, 12).map(artist => ({...artist, artistName: artist.artistName || 'Unknown artist'}));
  return { totalContributions: stats[0]?.totalContributions ?? 0, selfEdits: editCount[0]?.total ?? 0, artistsAdded: addedCount[0]?.total ?? 0, approved: stats[0]?.approved ?? 0, pending: stats[0]?.pending ?? 0, entries, suggestions };
}
