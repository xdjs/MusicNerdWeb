import { eq, sql } from 'drizzle-orm';
import type { db } from '@/server/db/drizzle';
import { artistSelfEdits, users } from '@/server/db/schema';
import { getArtistOperationOwnership } from '../artistOperationContext';
import { OwnershipChangedError } from '../queries/ownershipWrites';

/** Called inside the authorized artist-row transaction, after a changed link write. */
export async function recordArtistSelfEdit(
    transaction: Pick<typeof db, 'query' | 'insert' | 'execute'>,
    artistId: string, siteName: string, oldValue: string | null, newValue: string, submittedUrl: string,
) {
    const ownership = getArtistOperationOwnership(artistId);
    if (!ownership?.userId || !ownership.expectedClaimId || oldValue === newValue) return;
    // Claim moderation does not take the artist lock. Revalidate and hold this
    // claim until commit so a concurrent revocation cannot silently drop an event.
    const [claim] = await transaction.execute<{ user_id: string }>(sql`
        SELECT user_id FROM artist_claims
        WHERE id = ${ownership.expectedClaimId}::uuid AND artist_id = ${artistId}::uuid
          AND status = 'approved'
        FOR SHARE
    `);
    if (!claim) throw new OwnershipChangedError();
    if (claim.user_id !== ownership.userId) {
        const user = await transaction.query.users.findFirst({ where: eq(users.id, ownership.userId) });
        if (!user?.isAdmin) throw new OwnershipChangedError();
        // Administrators can edit others' artists, but that is not a self-edit.
        return;
    }
    await transaction.insert(artistSelfEdits).values({
        artistId, userId: ownership.userId, siteName, oldValue, newValue, submittedUrl,
    });
}
