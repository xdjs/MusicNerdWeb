import { asc, count, eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth-helpers';
import { db } from '@/server/db/drizzle';
import { artistBioCorrections, artists } from '@/server/db/schema';

/** Keep private reports behind admin authorization, including sidebar counts. */
export async function getPendingBioCorrections() {
  const auth = await requireAdmin();
  if (!auth.authenticated) throw new Error('Administrator access required');
  const [reports, totals] = await Promise.all([
    db.select({report: artistBioCorrections, artistName: artists.name}).from(artistBioCorrections)
      .innerJoin(artists, eq(artists.id, artistBioCorrections.artistId))
      .where(eq(artistBioCorrections.status, 'pending')).orderBy(asc(artistBioCorrections.createdAt)).limit(100),
    db.select({total: count()}).from(artistBioCorrections).where(eq(artistBioCorrections.status, 'pending')),
  ]);
  return {reports, total: totals[0]?.total ?? 0};
}
