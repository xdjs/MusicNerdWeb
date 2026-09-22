import { db } from '@/server/db/drizzle';
import { artists, artistSelfEdits, ugcresearch } from '@/server/db/schema';
import { desc, eq, sql } from 'drizzle-orm';

/** All ownership comes from requireAuth at the caller, never query-string IDs. */
export async function getProfileSummary(userId: string) {
  const [stats, entries, addedCount, editCount] = await Promise.all([
    db.select({ totalContributions: sql<number>`count(*)::int`, approved: sql<number>`count(*) filter (where ${ugcresearch.accepted} = true)::int`, pending: sql<number>`count(*) filter (where ${ugcresearch.accepted} = false)::int` }).from(ugcresearch).where(eq(ugcresearch.userId, userId)),
    db.select({ id: ugcresearch.id, artistId: artists.id, artistName: artists.name, imageUrl: artists.customImage, siteName: ugcresearch.siteName, ugcUrl: ugcresearch.ugcUrl, accepted: ugcresearch.accepted, createdAt: ugcresearch.createdAt }).from(ugcresearch).leftJoin(artists, eq(artists.id, ugcresearch.artistId)).where(eq(ugcresearch.userId, userId)).orderBy(desc(ugcresearch.createdAt), desc(ugcresearch.id)).limit(3),
    db.select({total: sql<number>`count(*)::int`}).from(artists).where(eq(artists.addedBy, userId)),
    db.select({total: sql<number>`count(*)::int`}).from(artistSelfEdits).where(eq(artistSelfEdits.userId, userId)),
  ]);
  return { totalContributions: stats[0]?.totalContributions ?? 0, selfEdits: editCount[0]?.total ?? 0, artistsAdded: addedCount[0]?.total ?? 0, approved: stats[0]?.approved ?? 0, pending: stats[0]?.pending ?? 0, entries };
}
