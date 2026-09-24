import { db } from "@/server/db/drizzle";
import { sql } from "drizzle-orm";

/** Every column a reset can clear: the social platforms research fills, plus the two
 *  DSP ids a seed may keep. The list is the research benchmark's. */
export const RESETTABLE_COLUMNS = ["instagram", "x", "youtube", "tiktok", "facebook", "soundcloud", "bandcamp", "twitch", "spotify", "deezer"] as const;

export type DspSnapshot = { spotify: string | null; deezer: string | null };

/**
 * Puts an artist back in the state one actually arrives in: the seed DSP ids and nothing
 * else. Every resettable column the seed does not name is cleared and the vault emptied,
 * so anything research ends up holding, it found. When a DSP id is being cleared it is
 * snapshotted first and returned, because those are the artist's real identifiers and
 * not ours to lose; the caller puts them back with `restoreArtistDsp`.
 */
export async function resetArtistForResearch(artistId: string, seed: readonly string[]): Promise<DspSnapshot | null> {
    const clear = RESETTABLE_COLUMNS.filter(column => !seed.includes(column));
    const clearsDsp = clear.includes("spotify") || clear.includes("deezer");
    let snapshot: DspSnapshot | null = null;
    if (clearsDsp) {
        const result = await db.execute(sql.raw(`select spotify, deezer from artists where id = '${artistId}'`));
        const row = rows(result)[0] ?? {};
        snapshot = { spotify: row.spotify ?? null, deezer: row.deezer ?? null };
    }
    await db.execute(sql.raw(`update artists set ${clear.map(column => `${column} = null`).join(", ")} where id = '${artistId}'`));
    await db.execute(sql`delete from artist_vault_sources where artist_id = ${artistId}::uuid`);
    return snapshot;
}

/** postgres-js returns the row list itself; other drivers wrap it in `{ rows }`. */
function rows(result: unknown): Array<Record<string, string | null>> {
    if (Array.isArray(result)) return result;
    return (result as { rows?: Array<Record<string, string | null>> }).rows ?? [];
}
