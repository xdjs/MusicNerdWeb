import { and, eq, sql } from 'drizzle-orm';
import { artistBioVersions } from '@/server/db/schema';
import { isRealBio } from '@/lib/bio/bioConstants';
import type { ScopedWriteDb } from '@/server/utils/queries/ownershipWrites';

/** Preserve each text/evidence pair, even when generation produced identical prose. */
export async function saveBioHistory(tx: Pick<ScopedWriteDb, 'query' | 'insert'>, artistId: string, versions: { text: string | null; provenance: unknown }[]) {
    for (const { text, provenance } of versions) {
        if (!isRealBio(text)) continue;
        const bioProvenance = provenance ?? null;
        const saved = await tx.query.artistBioVersions.findFirst({ where: and(
            eq(artistBioVersions.artistId, artistId), eq(artistBioVersions.bioText, text!),
            sql`${artistBioVersions.bioProvenance} is not distinct from ${bioProvenance === null ? null : JSON.stringify(bioProvenance)}::jsonb`,
        ) });
        if (!saved) await tx.insert(artistBioVersions).values({ artistId, bioText: text!, bioProvenance, isPinned: false });
    }
}
