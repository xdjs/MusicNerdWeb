import { sql } from "drizzle-orm";
import { db } from "@/server/db/drizzle";
import { publicVaultSourceSql } from "./publicVaultSourceSql";
import { projectSavedPublicBio } from "./projectSavedPublicBio";

/** One read snapshot binds displayed text, its durable provenance, current claim and current eligible evidence. */
export async function getPublicSavedBio(artistId: string, reader: Pick<typeof db, "execute"> = db): Promise<string | null> {
  const [row] = (await reader.execute(sql`
    select a.bio,p.provenance,
      (select id::text from artist_claims where artist_id=a.id and status='approved' limit 1) as "claimId",
      coalesce((select jsonb_agg(jsonb_build_object(
        'id',v.id,'url',v.url,'activityId',v.activity_id,'origin',v.origin,'publication',v.publication,
        'extractedText',v.extracted_text,'title',v.title,'snippet',v.snippet,'publishedAt',v.published_at,'filePath',v.file_path))
        from artist_vault_sources v where v.artist_id=a.id and ${publicVaultSourceSql()}), '[]'::jsonb) as evidence
    from artists a left join mn_private.artist_bio_provenance p on p.artist_id=a.id where a.id=${artistId}::uuid limit 1
  `)) as unknown as Parameters<typeof projectSavedPublicBio>[0][];
  return row ? projectSavedPublicBio(row) : null;
}
