import { db } from "@/server/db/drizzle";
import { eq, sql } from "drizzle-orm";
import { artists } from "@/server/db/schema";
import { lockScopedArtistWrite, withScopedArtistWrite } from "../queries/ownershipWrites";
import { sanitizeColumnName } from "./sanitizeColumnName";
import { assertWritableLinkColumn } from "./assertWritableLinkColumn";
import { getArtistLinkValue } from "./getArtistLinkValue";
type ArtistLinkExecutor = Pick<typeof db, "query" | "execute" | "insert">;
import { acquireArtistPlatformLock } from "../artistIdentityLocks";
export async function clearArtistLink(
  artistId: string,
  siteName: string
): Promise<{ oldValue: string | null }> {
  const columnName = sanitizeColumnName(siteName);
  assertWritableLinkColumn(columnName);

  if (columnName === "spotify" || columnName === "deezer") {
    return db.transaction(async (transaction) => {
      await acquireArtistPlatformLock(transaction, artistId, columnName);
      await lockScopedArtistWrite(transaction, artistId);
      return clearArtistLinkWithExecutor(transaction, artistId, columnName);
    });
  }

  return withScopedArtistWrite(artistId, tx => clearArtistLinkWithExecutor(tx, artistId, columnName));
}

async function clearArtistLinkWithExecutor(
  database: ArtistLinkExecutor,
  artistId: string,
  columnName: string,
): Promise<{ oldValue: string | null }> {
  // Fetch full row to capture oldValue for audit trail (MCP callers use the return value)
  const artist = await database.query.artists.findFirst({
    where: eq(artists.id, artistId),
  });
  if (!artist) {
    throw new Error(`Artist not found: ${artistId}`);
  }

  // Safe: assertWritable() above guarantees columnName is a known text column from the whitelist
  const oldValue = getArtistLinkValue(artist, columnName);

  // See setArtistLink: link changes no longer null/regenerate the bio.
  await database.execute(sql`UPDATE artists SET ${sql.identifier(columnName)} = NULL WHERE id = ${artistId}`);

  return { oldValue };
}
