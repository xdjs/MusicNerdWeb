import { db } from "@/server/db/drizzle";
import { sql } from "drizzle-orm";
import type { DspSnapshot } from "@/server/utils/evals/resetArtistForResearch";

/** Writes the DSP ids `resetArtistForResearch` snapshotted back onto the artist. A null
 *  snapshot means nothing was cleared, so there is nothing to restore. */
export async function restoreArtistDsp(artistId: string, snapshot: DspSnapshot | null): Promise<void> {
    if (!snapshot) return;
    await db.execute(sql`update artists set spotify = ${snapshot.spotify}, deezer = ${snapshot.deezer} where id = ${artistId}::uuid`);
}
