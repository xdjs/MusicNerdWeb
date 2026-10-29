import { recordArtistActivity } from '../activity/recordArtistActivity';
import { db } from "@/server/db/drizzle";
import { eq, and, sql } from "drizzle-orm";
import { artistClaims, artistVaultSources, artistBioVersions } from "@/server/db/schema";
import { withScopedArtistWrite, type ScopedWriteDb } from './ownershipWrites';
import { getActiveArtistOperation } from '../artistOperationContext';
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

