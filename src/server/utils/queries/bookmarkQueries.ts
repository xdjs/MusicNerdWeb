import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '@/server/db/drizzle';
import { userArtistBookmarks, users } from '@/server/db/schema';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** The account row is stable even when there are zero bookmarks. Legacy account
 * merges take these locks before reading bookmark state. */
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
