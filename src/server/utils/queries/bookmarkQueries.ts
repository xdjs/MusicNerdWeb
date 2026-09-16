import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '@/server/db/drizzle';
import { artists, userArtistBookmarks, users } from '@/server/db/schema';
import type { BookmarkItem } from '@/lib/bookmarks';
import { customImageUrl } from '@/lib/artist/artistImage';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type ReadDatabase = Pick<typeof db, 'select'>;

function storedImage(value: string | null): string | null {
    const trimmed = customImageUrl(value);
    if (!trimmed) return null;
    if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.includes('\\')) return trimmed;
    try {
        const url = new URL(trimmed);
        return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : null;
    } catch {
        return null;
    }
}

/** No catalog requests: names/images are joined from the current artist row. */
export async function getUserBookmarks(userId: string, database: ReadDatabase = db): Promise<BookmarkItem[]> {
    const rows = await database.select({
        artistId: userArtistBookmarks.artistId,
        artistName: artists.name,
        imageUrl: artists.customImage,
        deezer: artists.deezer,
    }).from(userArtistBookmarks).innerJoin(artists, eq(artists.id, userArtistBookmarks.artistId))
        .where(and(eq(userArtistBookmarks.userId, userId), isNull(userArtistBookmarks.removedAt)))
        .orderBy(asc(userArtistBookmarks.position), asc(userArtistBookmarks.createdAt), asc(userArtistBookmarks.artistId));
    return rows.map(({ deezer, ...row }) => ({
        ...row, artistName: row.artistName ?? 'Unknown Artist',
        imageUrl: storedImage(row.imageUrl) ?? (deezer && /^[1-9]\d*$/.test(deezer)
            ? `https://api.deezer.com/artist/${deezer}/image?size=medium` : null),
    }));
}

/** The account row is stable even when there are zero bookmarks. All writes,
 * including legacy account merges, take these locks before reading bookmark state. */
export async function lockBookmarkUsers(tx: Transaction, userIds: string[]): Promise<void> {
    const ids = [...new Set(userIds)].sort();
    const rows = await tx.select({ id: users.id }).from(users).where(inArray(users.id, ids))
        .orderBy(asc(users.id)).for('update');
    if (rows.length !== ids.length) throw new Error('Bookmark account no longer exists');
}

async function existingBookmarks(tx: Transaction, userId: string) {
    return tx.select({ artistId: userArtistBookmarks.artistId, createdAt: userArtistBookmarks.createdAt })
        .from(userArtistBookmarks).where(and(eq(userArtistBookmarks.userId, userId), isNull(userArtistBookmarks.removedAt)))
        .orderBy(asc(userArtistBookmarks.position), asc(userArtistBookmarks.createdAt), asc(userArtistBookmarks.artistId));
}

async function writeOrder(tx: Transaction, userId: string, artistIds: string[]) {
    if (!artistIds.length) return;
    const positions = sql.join(artistIds.map((id, index) => sql`WHEN ${id}::uuid THEN ${index}::integer`), sql` `);
    await tx.update(userArtistBookmarks)
        .set({ position: sql`CASE ${userArtistBookmarks.artistId} ${positions} ELSE ${userArtistBookmarks.position} END` })
        .where(and(eq(userArtistBookmarks.userId, userId), inArray(userArtistBookmarks.artistId, artistIds)));
}

export async function addUserBookmarks(userId: string, artistIds: string[], importing = false): Promise<BookmarkItem[]> {
    return db.transaction(async (tx) => {
        await lockBookmarkUsers(tx, [userId]);
        const existing = await existingBookmarks(tx, userId);
        const existingIds = new Set(existing.map(({ artistId }) => artistId));
        const requested = [...new Set(artistIds)].filter((id) => !existingIds.has(id));
        if (requested.length) {
            const valid = await tx.select({ id: artists.id }).from(artists).where(inArray(artists.id, requested));
            const validIds = new Set(valid.map(({ id }) => id));
            const additions = requested.filter((id) => validIds.has(id));
            if (additions.length) {
                const insert = tx.insert(userArtistBookmarks).values(additions.map((artistId, position) => ({ userId, artistId, position })));
                if (importing) await insert.onConflictDoNothing({ target: [userArtistBookmarks.userId, userArtistBookmarks.artistId] });
                else await insert.onConflictDoUpdate({ target: [userArtistBookmarks.userId, userArtistBookmarks.artistId], set: { removedAt: null } });
                await writeOrder(tx, userId, [...additions, ...existing.map(({ artistId }) => artistId)]);
            }
        }
        return getUserBookmarks(userId, tx);
    });
}

export async function editUserBookmarks(userId: string, orderedArtistIds: string[], removedArtistIds: string[]): Promise<BookmarkItem[]> {
    return db.transaction(async (tx) => {
        await lockBookmarkUsers(tx, [userId]);
        if (removedArtistIds.length) {
            await tx.update(userArtistBookmarks).set({ removedAt: new Date().toISOString() }).where(and(eq(userArtistBookmarks.userId, userId), inArray(userArtistBookmarks.artistId, removedArtistIds)));
        }
        const existing = await existingBookmarks(tx, userId);
        const remaining = new Set(existing.map(({ artistId }) => artistId));
        const requested = [...new Set(orderedArtistIds)].filter((id) => remaining.has(id));
        const requestedSet = new Set(requested);
        // A stale client's draft cannot erase new bookmarks or resurrect a removal.
        // Keep unlisted/current entries first and reorder only the surviving draft.
        const order = [...existing.map(({ artistId }) => artistId).filter((id) => !requestedSet.has(id)), ...requested];
        await writeOrder(tx, userId, order);
        return getUserBookmarks(userId, tx);
    });
}

export async function removeUserBookmark(userId: string, artistId: string): Promise<BookmarkItem[]> {
    return editUserBookmarks(userId, [], [artistId]);
}

/** Called inside mergeAccounts after both user rows are locked. Keep the legacy
 * account's saved positions/createdAt; append only missing placeholder entries. */
export async function transferUserBookmarks(tx: Transaction, currentUserId: string, legacyUserId: string): Promise<void> {
    const target = await existingBookmarks(tx, legacyUserId);
    const source = await tx.select({ artistId: userArtistBookmarks.artistId, createdAt: userArtistBookmarks.createdAt, removedAt: userArtistBookmarks.removedAt }).from(userArtistBookmarks).where(eq(userArtistBookmarks.userId, currentUserId));
    const targetIds = new Set(target.map(({ artistId }) => artistId));
    const additions = source.filter(({ artistId }) => !targetIds.has(artistId));
    if (!additions.length) return;
    await tx.insert(userArtistBookmarks).values(additions.map(({ artistId, createdAt, removedAt }, index) => ({
        userId: legacyUserId, artistId, createdAt, removedAt, position: target.length + index,
    }))).onConflictDoNothing({ target: [userArtistBookmarks.userId, userArtistBookmarks.artistId] });
    await writeOrder(tx, legacyUserId, [...target.map(({ artistId }) => artistId), ...additions.map(({ artistId }) => artistId)]);
}
