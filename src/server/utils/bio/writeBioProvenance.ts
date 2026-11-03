import {eq} from 'drizzle-orm';
import {artistBioProvenance} from '@/server/db/schema';
import type {ScopedWriteDb} from '@/server/utils/queries/ownershipWrites';
/** Write current private lineage in the same artist-locked transaction as its text. */
export async function writeBioProvenance(tx: Pick<ScopedWriteDb,'insert'|'delete'>, artistId:string, provenance:unknown) {
    if (provenance == null) {
        await tx.delete(artistBioProvenance).where(eq(artistBioProvenance.artistId,artistId));
        return;
    }
    await tx.insert(artistBioProvenance).values({artistId,provenance}).onConflictDoUpdate({target:artistBioProvenance.artistId,set:{provenance}});
}
