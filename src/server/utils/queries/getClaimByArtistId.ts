import { db } from '@/server/db/drizzle';
import { and, eq, or } from 'drizzle-orm';
import { artistClaims } from '@/server/db/schema';

/**
 * Returns the active pending/approved claim, null when none exists, or
 * undefined when the lookup failed. Rejected claims remain audit history
 * and must not block a new claim. A failed read cannot establish Unclaimed.
 */
export async function getClaimByArtistId(artistId: string) {
    try {
        return await db.query.artistClaims.findFirst({
            where: and(
                eq(artistClaims.artistId, artistId),
                or(
                    eq(artistClaims.status, 'pending'),
                    eq(artistClaims.status, 'approved'),
                ),
            ),
        }) ?? null;
    } catch (error) {
        console.error('[getClaimByArtistId] Error:', error);
        return undefined;
    }
}
