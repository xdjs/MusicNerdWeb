import {writeBioProvenance} from '../bio/writeBioProvenance';
import { createHash } from 'node:crypto';
import { retainEditedBioProvenance } from '../bio/retainEditedBioProvenance';
import { saveBioHistory } from '../bio/saveBioHistory';
import { recordArtistActivity } from '../activity/recordArtistActivity';
import { db } from '@/server/db/drizzle';
import { artists, artistBioVersions, artistDocs, artistOnboardingSteps, artistClaims, artistBioProvenance } from '@/server/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { BioConflictError } from '@/lib/bio/bioConflict';
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
        const previousProvenance = (await tx.query.artistBioProvenance.findFirst({where:eq(artistBioProvenance.artistId,artistId)}))?.provenance ?? null;
        // This legacy writer has no server-validated generation manifest. Do not
        // label echoed document sources as trustworthy evidence.
        const bioProvenance = options.generated
            ? { version: 1, kind: 'unknown', bioHash: createHash('sha256').update(bio).digest('hex') }
            : retainEditedBioProvenance(artist.bio, bio, previousProvenance);
        if (artist.bio === bio && JSON.stringify(previousProvenance ?? null) === JSON.stringify(bioProvenance)) return bio;
        await saveBioHistory(tx, artistId, [
            { text: artist.bio, provenance: previousProvenance },
            { text: bio, provenance: bioProvenance },
        ]);
        await writeBioProvenance(tx,artistId,bioProvenance);
        await tx.update(artists).set({ bio }).where(eq(artists.id, artistId));
        const automatic = options.generated && !options.ownership.userId && !options.document;
        await recordArtistActivity(artistId, options.generated ? 'about_generated' : 'about_edited', {
            userId: options.ownership.userId,
            actorKind: options.ownership.userId ? 'user' : automatic ? 'system' : 'unknown',
            trigger: options.document ? 'onboarding' : automatic ? 'automatic_about' : 'about_editor',
        }, tx);
        return bio;
    });
}
