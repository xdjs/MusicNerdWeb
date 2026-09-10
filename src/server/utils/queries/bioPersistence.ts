import { db } from '@/server/db/drizzle';
import { artists, artistBioVersions, artistDocs, artistOnboardingSteps, artistClaims } from '@/server/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { isRealBio } from '@/lib/bioConstants';
import { BioConflictError } from '@/lib/bioConflict';
import { authorizeLockedArtistWrite, OwnershipChangedError } from './ownershipWrites';

export type BioWriteOwnership = { expectedClaimId: string | null; userId?: string };

/** All bio writers take the artist row lock, including pin and delete. A model
 * call must never hold this lock; compare its starting bio after it finishes. */
export async function persistArtistBio(artistId: string, bio: string, options: {
    ownership: BioWriteOwnership;
    generated?: boolean; expectedBio?: string | null;
    document?: { content: string; sources: unknown[] };
    confirmSteps?: ('interview' | 'publish')[];
}): Promise<string | null> {
    return db.transaction(async tx => {
        await tx.execute(sql`select id from artists where id = ${artistId}::uuid for update`);
        if (!options?.ownership) throw new OwnershipChangedError();
        if (options.ownership.userId) {
            await authorizeLockedArtistWrite(tx, artistId, { userId: options.ownership.userId, expectedClaimId: options.ownership.expectedClaimId });
        } else {
            // Existing automatic generation has no initiating user, but still
            // cannot publish across a claim/revocation boundary.
            const claim = await tx.query.artistClaims.findFirst({ where: and(eq(artistClaims.artistId, artistId), eq(artistClaims.status, 'approved')) });
            if ((claim?.id ?? null) !== options.ownership.expectedClaimId) throw new OwnershipChangedError();
        }
        const artist = await tx.query.artists.findFirst({ where: eq(artists.id, artistId) });
        if (!artist) throw new Error('Artist not found');
        const pinned = await tx.query.artistBioVersions.findFirst({
            where: and(eq(artistBioVersions.artistId, artistId), eq(artistBioVersions.isPinned, true)),
        });
        if (pinned) {
            if (options.generated) throw new BioConflictError();
            if (!options.generated && bio !== pinned.bioText) {
                throw new Error('Unpin your bio before editing it. Your saved version will be kept.');
            }
            return artist.bio;
        }
        if (options.generated && artist.bio !== options.expectedBio) throw new BioConflictError();
        // Confirmation rolls back with the document/bio/history on any failure.
        for (const step of options.confirmSteps ?? []) {
            await tx.insert(artistOnboardingSteps).values({ artistId, step }).onConflictDoNothing({
                target: [artistOnboardingSteps.artistId, artistOnboardingSteps.step],
            });
        }
        // Onboarding publishes one coherent snapshot. A failed document, history,
        // or bio write rolls the entire transaction back; conflicts write nothing.
        if (options.document) {
            const { content, sources } = options.document;
            await tx.insert(artistDocs).values({ artistId, content, sources }).onConflictDoUpdate({
                target: [artistDocs.artistId],
                set: { content, sources, updatedAt: sql`(now() AT TIME ZONE 'utc'::text)` },
            });
        }
        if (artist.bio === bio) return bio;
        // Preserve both sides of every edit. History is deleted only explicitly.
        for (const text of [artist.bio, bio].filter((v): v is string => isRealBio(v))) {
            const saved = await tx.query.artistBioVersions.findFirst({
                where: and(eq(artistBioVersions.artistId, artistId), eq(artistBioVersions.bioText, text)),
            });
            if (!saved) await tx.insert(artistBioVersions).values({ artistId, bioText: text, isPinned: false });
        }
        await tx.update(artists).set({ bio }).where(eq(artists.id, artistId));
        return bio;
    });
}
