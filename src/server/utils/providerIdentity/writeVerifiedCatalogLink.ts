import { sql } from 'drizzle-orm';
import type { db } from '@/server/db/drizzle';
import { ArtistLinkConflictError } from '@/server/utils/artistLinks/ArtistLinkConflictError';
import type { CatalogWriteEvidence } from './types';

/** Compare both observed IDs in the existing identity-write transaction. */
export async function writeVerifiedCatalogLink(database: Pick<typeof db, 'execute'>, artistId: string, columnName: string, value: string, evidence: CatalogWriteEvidence): Promise<void> {
    const isDeezer = "previousDeezerId" in evidence;
    if (
      columnName !== (isDeezer ? "deezer" : "spotify") ||
      value !== (isDeezer ? evidence.deezerId : evidence.spotifyId)
    )
      throw new ArtistLinkConflictError("Automatic catalog evidence does not match the write");
    const result = await database.execute(
        isDeezer
          ? sql`
        UPDATE artists SET deezer = ${value}
        WHERE id = ${artistId} AND spotify = ${evidence.spotifyId}
          AND deezer IS NOT DISTINCT FROM ${evidence.previousDeezerId}
        RETURNING id
      `
          : sql`
        UPDATE artists SET spotify = ${value}
        WHERE id = ${artistId} AND deezer = ${evidence.deezerId}
          AND spotify IS NOT DISTINCT FROM ${evidence.previousSpotifyId}
        RETURNING id
      `,
      );
    const updated = Array.isArray(result) ? result : (result as { rows?: unknown[] }).rows;
    if (updated?.length !== 1)
      throw new ArtistLinkConflictError("Catalog identity changed during automatic verification");
}
