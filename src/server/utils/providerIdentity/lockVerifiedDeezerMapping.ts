import { sql } from "drizzle-orm";
import type { db } from "@/server/db/drizzle";
import { hasVerifiedDeezerPair } from "@/server/utils/providerIdentity/hasVerifiedDeezerPair";

/**
 * Corroborates a mapping and locks its observed catalog snapshot through commit.
 * The caller already holds the artist/platform and destination identity locks.
 *
 * @param transaction - The mapping transaction.
 * @param artist - The catalog slots observed inside that transaction.
 * @param deezerId - The proposed mapping, regardless of caller confidence/source.
 * @returns Whether fresh proof and both unchanged catalog slots were locked.
 */
export async function lockVerifiedDeezerMapping(
  transaction: Pick<typeof db, "execute">,
  artist: { id: string; spotify: string | null; deezer: string | null },
  deezerId: string,
): Promise<boolean> {
  if (!(await hasVerifiedDeezerPair(artist.spotify, deezerId))) return false;
  const rows = await transaction.execute(sql`
    SELECT id FROM artists
    WHERE id = ${artist.id}::uuid
      AND spotify IS NOT DISTINCT FROM ${artist.spotify}
      AND deezer IS NOT DISTINCT FROM ${artist.deezer}
    FOR UPDATE
  `);
  return rows.length === 1;
}
