import { db } from '@/server/db/drizzle';
import { artists, artistBioVersions } from '@/server/db/schema';
import { and, eq, sql } from 'drizzle-orm';

/** All bio writers take the artist row lock, including pin and delete. A model
 * call must never hold this lock; compare its starting bio after it finishes. */
export async function persistArtistBio(artistId: string, bio: string, options: {
    generated?: boolean; expectedBio?: string | null;
} = {}): Promise<string | null> {
    return db.transaction(async tx => {
        await tx.execute(sql`select id from artists where id = ${artistId}::uuid for update`);
        const artist = await tx.query.artists.findFirst({ where: eq(artists.id, artistId) });
        if (!artist) throw new Error('Artist not found');
        const pinned = await tx.query.artistBioVersions.findFirst({
            where: and(eq(artistBioVersions.artistId, artistId), eq(artistBioVersions.isPinned, true)),
        });
        if (pinned) {
            if (!options.generated && bio !== pinned.bioText) {
                throw new Error('Unpin your bio before editing it. Your saved version will be kept.');
            }
            return artist.bio;
        }
        if (options.generated && artist.bio !== options.expectedBio) return artist.bio;
        if (artist.bio === bio) return bio;
        // Preserve both sides of every edit. History is deleted only explicitly.
        for (const text of [artist.bio, bio].filter((v): v is string => !!v)) {
            const saved = await tx.query.artistBioVersions.findFirst({
                where: and(eq(artistBioVersions.artistId, artistId), eq(artistBioVersions.bioText, text)),
            });
            if (!saved) await tx.insert(artistBioVersions).values({ artistId, bioText: text, isPinned: false });
        }
        await tx.update(artists).set({ bio }).where(eq(artists.id, artistId));
        return bio;
    });
}
