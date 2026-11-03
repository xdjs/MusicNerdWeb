import {sql} from 'drizzle-orm';
import {ABOUT_EMPTY_STATE} from '@/lib/bio/bioConstants';
import type {ScopedWriteDb} from '@/server/utils/queries/ownershipWrites';
/** Preserve revoked text and its private lineage atomically before clearing current content. */
export async function preserveRevokedBio(tx: Pick<ScopedWriteDb,'execute'>, artistId:string) {
    await tx.execute(sql`with current_bio as (
                    select a.id,a.bio,p.provenance from artists a left join mn_private.artist_bio_provenance p on p.artist_id=a.id
                    where a.id=${artistId}::uuid and a.bio is not null
                      and btrim(a.bio, E' \\t\\n\\r') <> '' and btrim(a.bio, E' \\t\\n\\r') <> ${ABOUT_EMPTY_STATE}
                ), saved as (
                    insert into artist_bio_versions(artist_id,bio_text,is_pinned)
                    select c.id,c.bio,false from current_bio c where not exists (
                        select 1 from artist_bio_versions v left join mn_private.artist_bio_version_provenance p on p.version_id=v.id
                        where v.artist_id=c.id and v.bio_text=c.bio and p.provenance is not distinct from c.provenance
                    ) returning id,artist_id
                ) insert into mn_private.artist_bio_version_provenance(version_id,provenance)
                  select s.id,c.provenance from saved s join current_bio c on c.id=s.artist_id where c.provenance is not null`);
}
