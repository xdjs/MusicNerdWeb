import { db } from "@/server/db/drizzle";
import { artistDocCorrections } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export type DocCorrection = {
    id: string;
    claim: string;
    correction: string | null;
    kind: string;
};

/** Never throws: the knowledge document must still build when this table is
 *  unreachable. Losing corrections for one rebuild is recoverable; failing the
 *  rebuild leaves the artist with no document at all. */
export async function getDocCorrections(artistId: string): Promise<DocCorrection[]> {
    try {
        const rows = await db
            .select()
            .from(artistDocCorrections)
            .where(eq(artistDocCorrections.artistId, artistId));
        return rows.map(r => ({ id: r.id, claim: r.claim, correction: r.correction, kind: r.kind }));
    } catch (e) {
        console.error("[getDocCorrections] Error:", e);
        return [];
    }
}
