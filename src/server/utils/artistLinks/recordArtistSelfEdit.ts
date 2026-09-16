import { and, eq } from 'drizzle-orm';
import type { db } from '@/server/db/drizzle';
import { artistClaims, artistSelfEdits } from '@/server/db/schema';
import { getArtistOperationOwnership } from '../artistOperationContext';

/** Called inside the authorized artist-row transaction, after a changed link write. */
export async function recordArtistSelfEdit(
    transaction: Pick<typeof db, 'query' | 'insert'>,
    artistId: string, siteName: string, oldValue: string | null, newValue: string, submittedUrl: string,
) {
    const ownership = getArtistOperationOwnership(artistId);
    if (!ownership?.userId || !ownership.expectedClaimId) return;
    const claim = await transaction.query.artistClaims.findFirst({ where: and(
        eq(artistClaims.id, ownership.expectedClaimId), eq(artistClaims.artistId, artistId),
        eq(artistClaims.userId, ownership.userId), eq(artistClaims.status, 'approved'),
    ) });
    // Administrators can edit others' artists, but that is not a self-edit.
    if (!claim || oldValue === newValue) return;
    await transaction.insert(artistSelfEdits).values({
        artistId, userId: ownership.userId, siteName, oldValue, newValue, submittedUrl,
    });
}
