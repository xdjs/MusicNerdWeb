import { and, eq, gte, sql } from 'drizzle-orm';
import { db } from '@/server/db/drizzle';
import { artistBioCorrections } from '@/server/db/schema';
import type { validateBioCorrection } from '@/lib/bio/validateBioCorrection';

/** Serialize submissions per user so concurrent requests cannot evade the daily bound. */
export async function submitBioCorrection(userId: string, artistId: string, input: NonNullable<ReturnType<typeof validateBioCorrection>>, bioSnapshot: string) {
  return db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`bio-correction:${userId}`}, 0))`);
    const [duplicate] = await tx.select({ id: artistBioCorrections.id }).from(artistBioCorrections).where(and(eq(artistBioCorrections.userId, userId), eq(artistBioCorrections.artistId, artistId), eq(artistBioCorrections.bioSnapshot, bioSnapshot), eq(artistBioCorrections.status, 'pending'), eq(artistBioCorrections.reason, input.reason), eq(artistBioCorrections.details, input.details), sql`${artistBioCorrections.sourceUrl} is not distinct from ${input.sourceUrl}`)).limit(1);
    if (duplicate) return 'duplicate' as const;
    const recent = await tx.select({ id: artistBioCorrections.id }).from(artistBioCorrections).where(and(eq(artistBioCorrections.userId, userId), gte(artistBioCorrections.createdAt, new Date(Date.now() - 86400000).toISOString()))).limit(5);
    if (recent.length >= 5) return 'limited' as const;
    await tx.insert(artistBioCorrections).values({ artistId, userId, reason: input.reason, details: input.details, sourceUrl: input.sourceUrl, bioSnapshot });
    return 'created' as const;
  });
}
