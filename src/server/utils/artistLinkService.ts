/**
 * Shared helpers for writing/clearing platform links on artist records.
 * Used by MCP tools (Phase 3) and will replace inline logic in artistQueries.ts (Phase 2A integration).
 */
import { db } from "@/server/db/drizzle";
import { sql } from "drizzle-orm";
import { generateArtistBio } from "./queries/artistQueries";

export const BIO_RELEVANT_COLUMNS = ["spotify", "instagram", "x", "soundcloud", "youtube", "youtubechannel"];

// Whitelist of platform columns that can be written via link helpers.
// Derived from the artists table schema — only platform/social columns.
// System columns (id, name, bio, etc.) are excluded by omission.
const WRITABLE_LINK_COLUMNS = new Set([
  "bandcamp", "facebook", "x", "soundcloud", "patreon", "instagram",
  "youtube", "youtubechannel", "spotify", "twitch", "imdb", "musicbrainz",
  "wikidata", "mixcloud", "facebookID", "discogs", "tiktok", "tiktokID",
  "jaxsta", "famousbirthdays", "songexploder", "colorsxstudios", "bandsintown",
  "linktree", "onlyfans", "wikipedia", "audius", "zora", "catalog", "opensea",
  "foundation", "lastfm", "linkedin", "soundxyz", "mirror", "glassnode",
  "spotifyusername", "bandcampfan", "tellie", "lens", "cameo", "farcaster",
  "supercollector", "ens", "mintsongs",
]);

export function sanitizeColumnName(siteName: string): string {
  return siteName.replace(/[^a-zA-Z0-9_]/g, "");
}

function assertWritable(columnName: string): void {
  if (!columnName) {
    throw new Error("Invalid column name");
  }
  if (columnName === "wallets" || columnName === "wallet") {
    throw new Error("Wallets must be managed through dedicated array operations");
  }
  if (!WRITABLE_LINK_COLUMNS.has(columnName)) {
    throw new Error(`Column not in writable whitelist: ${columnName}`);
  }
}

export async function setArtistLink(
  artistId: string,
  siteName: string,
  value: string
): Promise<void> {
  const columnName = sanitizeColumnName(siteName);
  assertWritable(columnName);

  if (!value) {
    throw new Error("Value must not be empty");
  }

  // For bio-relevant columns, set value and null bio in a single statement
  if (BIO_RELEVANT_COLUMNS.includes(columnName)) {
    await db.execute(sql`UPDATE artists SET ${sql.identifier(columnName)} = ${value}, bio = NULL WHERE id = ${artistId}`);
    await generateArtistBio(artistId);
  } else {
    await db.execute(sql`UPDATE artists SET ${sql.identifier(columnName)} = ${value} WHERE id = ${artistId}`);
  }
}

export async function clearArtistLink(
  artistId: string,
  siteName: string
): Promise<void> {
  const columnName = sanitizeColumnName(siteName);
  assertWritable(columnName);

  if (BIO_RELEVANT_COLUMNS.includes(columnName)) {
    await db.execute(sql`UPDATE artists SET ${sql.identifier(columnName)} = NULL, bio = NULL WHERE id = ${artistId}`);
    await generateArtistBio(artistId);
  } else {
    await db.execute(sql`UPDATE artists SET ${sql.identifier(columnName)} = NULL WHERE id = ${artistId}`);
  }
}
