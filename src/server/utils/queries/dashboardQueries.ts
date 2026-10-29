import { recordArtistActivity } from '../activity/recordArtistActivity';
import { db } from "@/server/db/drizzle";
import { eq, and, sql } from "drizzle-orm";
import { artistClaims, artistVaultSources, artistBioVersions, artists } from "@/server/db/schema";
import { withArtistUploadWrite, withScopedArtistWrite, authorizeLockedArtistWrite, type ArtistWriteAuth, type WriteDb, type ScopedWriteDb } from './ownershipWrites';
import { getActiveArtistOperation } from '../artistOperationContext';
import { isRealBio } from '@/lib/bio/bioConstants';
import { canonicalizeLoreUrl } from '@/lib/source/canonicalizeLoreUrl';

export { getClaimByArtistId } from './getClaimByArtistId';

export async function getApprovedClaimByUserId(userId: string) {
    try {
        return await db.query.artistClaims.findFirst({
            where: and(
                eq(artistClaims.userId, userId),
                eq(artistClaims.status, "approved"),
            ),
            with: { artist: true },
        });
    } catch (e) {
        console.error("[getApprovedClaimByUserId] Error:", e);
        return undefined;
    }
}

// TODO: Add cursor-based pagination when claims exceed ~500 rows
// Pending claims sort first so they're never crowded out by older approved/rejected ones
export async function getAllClaims() {
    const limit = 200;
    try {
        return await db.query.artistClaims.findMany({
            with: { user: true, artist: true },
            orderBy: (claims, { asc, desc }) => [
                asc(sql`CASE WHEN ${claims.status} = 'pending' THEN 0 WHEN ${claims.status} = 'approved' THEN 1 ELSE 2 END`),
                desc(claims.createdAt),
            ],
            limit,
        });
    } catch (e) {
        console.error("[getAllClaims] Error:", e);
        return [];
    }
}

export async function getApprovedClaimForArtistByUserId(userId: string, artistId: string) {
    try {
        return await db.query.artistClaims.findFirst({
            where: and(
                eq(artistClaims.userId, userId),
                eq(artistClaims.artistId, artistId),
                eq(artistClaims.status, "approved"),
            ),
        });
    } catch (e) {
        console.error("[getApprovedClaimForArtistByUserId] Error:", e);
        return undefined;
    }
}

export async function getPendingClaimByUserId(userId: string) {
    try {
        return await db.query.artistClaims.findFirst({
            where: and(
                eq(artistClaims.userId, userId),
                eq(artistClaims.status, "pending"),
            ),
            with: { artist: true },
        });
    } catch (e) {
        console.error("[getPendingClaimByUserId] Error:", e);
        return undefined;
    }
}

export async function getVaultSourcesByArtistId(artistId: string, status?: string) {
    try {
        if (status) {
            return await db.query.artistVaultSources.findMany({
                where: and(
                    eq(artistVaultSources.artistId, artistId),
                    eq(artistVaultSources.status, status as "pending" | "approved" | "rejected"),
                ),
                orderBy: (sources, { desc }) => [desc(sources.createdAt)],
            });
        }
        return await db.query.artistVaultSources.findMany({
            where: eq(artistVaultSources.artistId, artistId),
            orderBy: (sources, { desc }) => [desc(sources.createdAt)],
        });
    } catch (e) {
        console.error("[getVaultSourcesByArtistId] Error:", e);
        return [];
    }
}

export async function getVaultSourceByIdAndArtist(sourceId: string, artistId: string) {
    try {
        return await db.query.artistVaultSources.findFirst({
            where: and(
                eq(artistVaultSources.id, sourceId),
                eq(artistVaultSources.artistId, artistId),
            ),
        });
    } catch (e) {
        console.error("[getVaultSourceByIdAndArtist] Error:", e);
        return undefined;
    }
}

async function withVaultSourceWrite<T>(sourceId: string, write: (tx: ScopedWriteDb, predicate: ReturnType<typeof eq>) => Promise<T>): Promise<T> {
    const scope = getActiveArtistOperation();
    if (!scope) return write(db, eq(artistVaultSources.id, sourceId));
    return withScopedArtistWrite(scope.artistId, tx => write(tx, and(eq(artistVaultSources.id, sourceId), eq(artistVaultSources.artistId, scope.artistId))!));
}

export { insertVaultSource } from './insertVaultSource';

export async function updateVaultSourceContent(sourceId: string, data: {
    title?: string;
    snippet?: string;
    extractedText?: string | null;
    ogImage?: string;
    podcastEpisodeKey?: string | null;
    podcastShowTitle?: string | null;
    podcastEpisodeTitle?: string | null;
    publishedAt?: string | null;
}) {
    try {
        const [updated] = await withVaultSourceWrite(sourceId, async (tx, predicate) => tx
            .update(artistVaultSources)
            .set({
                ...(data.title !== undefined ? { title: data.title } : {}),
                ...(data.snippet !== undefined ? { snippet: data.snippet } : {}),
                ...(data.extractedText !== undefined ? { extractedText: data.extractedText } : {}),
                ...(data.ogImage !== undefined ? { ogImage: data.ogImage } : {}),
                ...(data.podcastEpisodeKey !== undefined ? { podcastEpisodeKey: data.podcastEpisodeKey } : {}),
                ...(data.podcastShowTitle !== undefined ? { podcastShowTitle: data.podcastShowTitle } : {}),
                ...(data.podcastEpisodeTitle !== undefined ? { podcastEpisodeTitle: data.podcastEpisodeTitle } : {}),
                ...(data.publishedAt !== undefined ? { publishedAt: data.publishedAt } : {}),
                updatedAt: sql`(now() AT TIME ZONE 'utc'::text)`,
            })
            .where(predicate)
            .returning());
        return updated;
    } catch (e) {
        console.error("[updateVaultSourceContent] Error:", e);
        throw e;
    }
}

// ------ Bio Versions ------

export async function getBioVersionsByArtistId(artistId: string) {
    try {
        return await db.query.artistBioVersions.findMany({
            where: eq(artistBioVersions.artistId, artistId),
            orderBy: (versions, { desc }) => [desc(versions.createdAt)],
        });
    } catch (e) {
        console.error("[getBioVersionsByArtistId] Error:", e);
        return [];
    }
}

const MAX_BIO_VERSIONS = 50;

export async function saveBioVersion(artistId: string, bioText: string, auth: ArtistWriteAuth) {
    try {
        if (!isRealBio(bioText)) throw new Error('Write a bio before saving a version.');
        // All operations in a single transaction to prevent TOCTOU race on version cap
        return await db.transaction(async (tx) => {
            await tx.execute(sql`select id from artists where id = ${artistId}::uuid for update`);
            await authorizeLockedArtistWrite(tx, artistId, auth);
            // Never discard an artist's saved history automatically.
            const existing = await tx.query.artistBioVersions.findMany({
                where: eq(artistBioVersions.artistId, artistId),
                orderBy: (v, { asc }) => [asc(v.createdAt)],
            });
            const saved = existing.find(version => version.bioText === bioText);
            if (saved) return saved;
            if (existing.length >= MAX_BIO_VERSIONS) {
                throw new Error("Bio version limit reached — delete an unwanted version first");
            }

            const [version] = await tx
                .insert(artistBioVersions)
                .values({ artistId, bioText, isPinned: false })
                .returning();
            return version;
        });
    } catch (e) {
        console.error("[saveBioVersion] Error:", e);
        throw e;
    }
}

export async function pinBioVersion(versionId: string, artistId: string, auth: ArtistWriteAuth) {
    try {
        // Atomic: unpin all → pin selected → update artist bio
        // Reauthorize under the same lock; artistId matching alone is not ownership.
        return await db.transaction(async (tx) => {
            await tx.execute(sql`select id from artists where id = ${artistId}::uuid for update`);
            await authorizeLockedArtistWrite(tx, artistId, auth);
            const selected = await tx.query.artistBioVersions.findFirst({
                where: and(eq(artistBioVersions.id, versionId), eq(artistBioVersions.artistId, artistId)),
            });
            if (!selected) return undefined;
            const current = await tx.query.artists.findFirst({ where: eq(artists.id, artistId) });
            if (current?.bio && isRealBio(current.bio) && current.bio !== selected.bioText) {
                const saved = await tx.query.artistBioVersions.findFirst({
                    where: and(eq(artistBioVersions.artistId, artistId), eq(artistBioVersions.bioText, current.bio)),
                });
                if (!saved) await tx.insert(artistBioVersions).values({ artistId, bioText: current.bio, isPinned: false });
            }
            await tx
                .update(artistBioVersions)
                .set({ isPinned: false })
                .where(eq(artistBioVersions.artistId, artistId));

            const [pinned] = await tx
                .update(artistBioVersions)
                .set({ isPinned: true })
                .where(and(eq(artistBioVersions.id, versionId), eq(artistBioVersions.artistId, artistId)))
                .returning();

            if (pinned) {
                await tx
                    .update(artists)
                    .set({ bio: pinned.bioText })
                    .where(eq(artists.id, artistId));
            }

            return pinned;
        });
    } catch (e) {
        console.error("[pinBioVersion] Error:", e);
        throw e;
    }
}

export async function deleteBioVersion(versionId: string, artistId: string, auth: ArtistWriteAuth) {
    try {
        // Atomic check + delete to prevent TOCTOU race with concurrent pin
        return await db.transaction(async (tx) => {
            await tx.execute(sql`select id from artists where id = ${artistId}::uuid for update`);
            await authorizeLockedArtistWrite(tx, artistId, auth);
            const version = await tx.query.artistBioVersions.findFirst({
                where: and(eq(artistBioVersions.id, versionId), eq(artistBioVersions.artistId, artistId)),
            });
            if (!version) return undefined;
            if (version.isPinned) throw new Error("Cannot delete a pinned bio version");

            const [deleted] = await tx
                .delete(artistBioVersions)
                .where(and(eq(artistBioVersions.id, versionId), eq(artistBioVersions.artistId, artistId)))
                .returning();
            return deleted;
        });
    } catch (e) {
        console.error("[deleteBioVersion] Error:", e);
        throw e;
    }
}

export async function unpinArtistBio(artistId: string, auth: ArtistWriteAuth) {
    await db.transaction(async tx => {
        await tx.execute(sql`select id from artists where id = ${artistId}::uuid for update`);
        await authorizeLockedArtistWrite(tx, artistId, auth);
        await tx.update(artistBioVersions).set({ isPinned: false })
            .where(eq(artistBioVersions.artistId, artistId));
    });
}
