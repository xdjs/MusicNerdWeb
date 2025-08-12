import { db } from "@/server/db/drizzle";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { artists, bookmarks } from "@/server/db/schema";

export type BookmarkRow = {
  artistId: string;
  artistName: string;
  imageUrl: string | null;
  orderIndex: number;
};

export async function getUserBookmarkIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ artistId: bookmarks.artistId })
    .from(bookmarks)
    .where(eq(bookmarks.userId, userId))
    .orderBy(asc(bookmarks.orderIndex), desc(bookmarks.createdAt));
  return rows.map((r) => r.artistId);
}

export async function getUserBookmarks(userId: string): Promise<BookmarkRow[]> {
  const rows = await db
    .select({
      artistId: bookmarks.artistId,
      orderIndex: bookmarks.orderIndex,
      createdAt: bookmarks.createdAt,
      name: artists.name,
      // Prefer spotify image later via joins if stored elsewhere; for now image is null here
    })
    .from(bookmarks)
    .leftJoin(artists, eq(artists.id, bookmarks.artistId))
    .where(eq(bookmarks.userId, userId))
    .orderBy(asc(bookmarks.orderIndex), desc(bookmarks.createdAt));

  return rows.map((r) => ({
    artistId: r.artistId,
    artistName: r.name ?? "",
    imageUrl: null,
    orderIndex: r.orderIndex ?? 0,
  }));
}

export async function addBookmark(
  userId: string,
  artistId: string
): Promise<void> {
  // Insert at the front: compute new head as min(order_index) - 1
  const [{ minOrder }] = await db.execute<{ minOrder: number }>(sql`
    SELECT COALESCE(MIN(order_index), 0) AS "minOrder"
    FROM bookmarks
    WHERE user_id = ${userId}
  `);

  const newOrder = (minOrder ?? 0) - 1;

  await db
    .insert(bookmarks)
    .values({ userId, artistId, orderIndex: newOrder })
    .onConflictDoNothing({ target: [bookmarks.userId, bookmarks.artistId] });
}

export async function removeBookmark(
  userId: string,
  artistId: string
): Promise<void> {
  await db.delete(bookmarks).where(
    and(eq(bookmarks.userId, userId), eq(bookmarks.artistId, artistId))
  );
}

export async function reorderBookmarks(
  userId: string,
  orderedArtistIds: string[]
): Promise<void> {
  if (!orderedArtistIds?.length) return;

  // Assign sequential order_index starting at 0
  // Use a VALUES table to update in one statement
  const values = orderedArtistIds.map((id, idx) => sql`(${id}, ${idx})`);

  await db.execute(sql`
    WITH new_order(artist_id, order_index) AS (
      VALUES ${sql.join(values, sql`, `)}
    )
    UPDATE bookmarks b
    SET order_index = n.order_index
    FROM new_order n
    WHERE b.user_id = ${userId} AND b.artist_id = n.artist_id
  `);
}



