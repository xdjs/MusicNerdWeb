import { db } from "@/server/db/drizzle";
import { sql } from "drizzle-orm";
import { generateArtistBio } from "./queries/artistQueries";

export const BIO_RELEVANT_COLUMNS = ["spotify", "instagram", "x", "soundcloud", "youtube", "youtubechannel"];

const SYSTEM_COLUMNS = new Set([
  "id", "name", "lcname", "bio", "addedBy", "createdAt", "updatedAt",
  "legacyId", "webmapdata", "nodePfp", "notes", "collectsNFTs",
]);

export function sanitizeColumnName(siteName: string): string {
  return siteName.replace(/[^a-zA-Z0-9_]/g, "");
}

function assertWritable(siteName: string): void {
  if (SYSTEM_COLUMNS.has(siteName)) {
    throw new Error(`Cannot write to system column: ${siteName}`);
  }
  if (siteName === "wallets" || siteName === "wallet") {
    throw new Error(`Wallets must be managed through dedicated array operations`);
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

  if (siteName === "ens") {
    await db.execute(sql`UPDATE artists SET ens = ${value} WHERE id = ${artistId}`);
  } else {
    await db.execute(sql`UPDATE artists SET ${sql.identifier(columnName)} = ${value} WHERE id = ${artistId}`);
  }

  if (BIO_RELEVANT_COLUMNS.includes(columnName)) {
    await db.execute(sql`UPDATE artists SET bio = NULL WHERE id = ${artistId}`);
    await generateArtistBio(artistId);
  }
}

export async function clearArtistLink(
  artistId: string,
  siteName: string
): Promise<void> {
  const columnName = sanitizeColumnName(siteName);
  assertWritable(columnName);

  await db.execute(sql`UPDATE artists SET ${sql.identifier(columnName)} = NULL WHERE id = ${artistId}`);

  if (BIO_RELEVANT_COLUMNS.includes(columnName)) {
    await db.execute(sql`UPDATE artists SET bio = NULL WHERE id = ${artistId}`);
    await generateArtistBio(artistId);
  }
}
