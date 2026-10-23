import type { CatalogWriteEvidence } from '../providerIdentity/types';
import { writeVerifiedCatalogLink } from '../providerIdentity/writeVerifiedCatalogLink';
import { cancelSpotifyMatchForIdentityEdit } from '../spotify/cancelSpotifyMatchForIdentityEdit';
import { db } from "@/server/db/drizzle";
import { eq, sql } from "drizzle-orm";
import { artists } from "@/server/db/schema";
import { lockScopedArtistWrite, withScopedArtistWrite } from "../queries/ownershipWrites";
import { sanitizeColumnName } from "./sanitizeColumnName";
import { assertWritableLinkColumn } from "./assertWritableLinkColumn";
import { getArtistLinkValue } from "./getArtistLinkValue";
type ArtistLinkExecutor = Pick<typeof db, "query" | "execute" | "insert">;
import { and } from "drizzle-orm";
import { artistIdMappings } from "@/server/db/schema";
import { acquireArtistPlatformWriteLocks } from "../artistIdentityLocks";
import { getArtistOperationOwnership } from "../artistOperationContext";
import { ArtistLinkConflictError } from "./ArtistLinkConflictError";
import { recordArtistSelfEdit } from "./recordArtistSelfEdit";
async function setArtistLinkWithExecutor(
  database: ArtistLinkExecutor,
  artistId: string,
  columnName: string,
  value: string,
  selfEditUrl?: string,
  evidence?: CatalogWriteEvidence,
): Promise<{ oldValue: string | null; artistName: string | null }> {
  // Fetch full row to capture oldValue for audit trail (MCP callers use the return value)
  const artist = await database.query.artists.findFirst({
    where: eq(artists.id, artistId),
  });
  if (!artist) {
    throw new Error(`Artist not found: ${artistId}`);
  }

  const oldValue = getArtistLinkValue(artist, columnName);
  if (columnName === "spotify" || columnName === "deezer") {
    const directColumn = columnName === "spotify" ? artists.spotify : artists.deezer;
    const [directOwner, mappingOwner, artistMapping] = await Promise.all([
      database.query.artists.findFirst({
        where: eq(directColumn, value),
        columns: { id: true },
      }),
      database.query.artistIdMappings.findFirst({
        where: and(
          eq(artistIdMappings.platform, columnName),
          eq(artistIdMappings.platformId, value),
        ),
        columns: { artistId: true },
      }),
      database.query.artistIdMappings.findFirst({
        where: and(
          eq(artistIdMappings.artistId, artistId),
          eq(artistIdMappings.platform, columnName),
        ),
        columns: { platformId: true },
      }),
    ]);
    if (directOwner && directOwner.id !== artistId) {
      throw new ArtistLinkConflictError(
        `That ${columnName} artist ID is already linked to a different artist`,
      );
    }
    if (
      (mappingOwner && mappingOwner.artistId !== artistId) ||
      (artistMapping && artistMapping.platformId !== value)
    ) {
      throw new ArtistLinkConflictError(
        `That ${columnName} artist ID conflicts with an existing artist mapping`,
      );
    }
  }

  // Update the link column only. We intentionally do NOT null or regenerate the
  // bio on link changes — that overwrote artist edits and re-ran generation on
  // every UGC/agent submission. The About refreshes on explicit regenerate, or
  // lazily when it's absent (MusicNerdAPI's /api/artistBio).
  if (evidence) {
    await writeVerifiedCatalogLink(database, artistId, columnName, value, evidence);
  } else {
    await database.execute(sql`UPDATE artists SET ${sql.identifier(columnName)} = ${value} WHERE id = ${artistId}`);
  }
  if (oldValue !== value && (columnName === 'spotify' || columnName === 'deezer')) {
    await cancelSpotifyMatchForIdentityEdit(database, artistId);
  }

  if (selfEditUrl && oldValue !== value) {
    await recordArtistSelfEdit(database, artistId, columnName, oldValue, value, selfEditUrl);
  }
  return { oldValue, artistName: artist.name ?? null };
}

export async function setArtistLink(
  artistId: string,
  siteName: string,
  value: string,
  selfEditUrl?: string,
  transaction?: Parameters<Parameters<typeof db.transaction>[0]>[0],
  evidence?: CatalogWriteEvidence,
): Promise<{ oldValue: string | null; artistName: string | null }> {
  if (selfEditUrl && !getArtistOperationOwnership(artistId)?.userId) {
    throw new Error("Self-edit recording requires an authenticated artist operation");
  }
  const columnName = sanitizeColumnName(siteName);
  assertWritableLinkColumn(columnName);

  if (!value) {
    throw new Error("Value must not be empty");
  }

  if (transaction) {
    if (columnName === "spotify" || columnName === "deezer") {
      await acquireArtistPlatformWriteLocks(transaction, artistId, columnName, value);
    }
    await lockScopedArtistWrite(transaction, artistId);
    return setArtistLinkWithExecutor(transaction, artistId, columnName, value, selfEditUrl, evidence);
  }

  if (columnName === "spotify" || columnName === "deezer") {
    return db.transaction(async (transaction) => {
      await acquireArtistPlatformWriteLocks(
        transaction,
        artistId,
        columnName,
        value,
      );
      await lockScopedArtistWrite(transaction, artistId);
      return setArtistLinkWithExecutor(transaction, artistId, columnName, value, selfEditUrl, evidence);
    });
  }

  return withScopedArtistWrite(artistId, tx => setArtistLinkWithExecutor(tx, artistId, columnName, value, selfEditUrl, evidence));
}
