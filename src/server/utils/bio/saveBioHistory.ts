import {recordBioSourceUrlReceipts} from './recordBioSourceUrlReceipts';
import { and, eq, sql } from 'drizzle-orm';
import { artistBioVersions, artistBioVersionProvenance } from '@/server/db/schema';
import { isRealBio } from '@/lib/bio/bioConstants';
import type { ScopedWriteDb } from '@/server/utils/queries/ownershipWrites';

/** Preserve each text/evidence pair; private evidence is never added to public history rows. */
export async function saveBioHistory(tx: Pick<ScopedWriteDb, 'query' | 'insert' | 'execute'>, artistId: string, versions: { text: string | null; provenance: unknown }[]) {
    for (const { text, provenance } of versions) {
        if (!isRealBio(text)) continue;
        const bioProvenance = provenance ?? null;
        await recordBioSourceUrlReceipts(tx, bioProvenance);
        const saved = await tx.query.artistBioVersions.findFirst({ where: and(
            eq(artistBioVersions.artistId, artistId), eq(artistBioVersions.bioText, text!),
            sql`(select p.provenance from mn_private.artist_bio_version_provenance p where p.version_id=${artistBioVersions.id}) is not distinct from ${bioProvenance === null ? null : JSON.stringify(bioProvenance)}::jsonb`,
        ) });
        if (!saved) {
            const [version] = await tx.insert(artistBioVersions).values({ artistId, bioText: text!, isPinned: false }).returning({id:artistBioVersions.id});
            if (!version) throw new Error('Could not preserve About history');
            if (bioProvenance != null) await tx.insert(artistBioVersionProvenance).values({versionId:version.id,provenance:bioProvenance});
        }
    }
}
