import { sql } from 'drizzle-orm';
import { db } from '@/server/db/drizzle';
import { parsePublicArtistAbout } from '@/lib/bio/parsePublicArtistAbout';
import type { PublicArtistAbout } from '@/lib/bio/types';

/** Read-only directory projection. Never widens the claim gate for private Lore. */
export async function getPublicArtistAbout(artistId: string): Promise<PublicArtistAbout | null> {
    const [row] = await db.execute<{ public_about: unknown }>(sql`
        select p.public_about from artist_directory_preparations p
        join artists a on a.id=p.artist_id
        join artist_activity_events e on e.id=p.activity_id and e.artist_id=a.id and e.trigger='directory_add'
        join artist_research_jobs j on j.id=p.job_id and j.artist_id=a.id and j.activity_id=e.id
        where p.artist_id=${artistId}::uuid and p.status='ready'
          and a.bio is not distinct from p.starting_bio
          and not exists(select 1 from artist_claims c where c.artist_id=a.id)
          and not exists(select 1 from artist_bio_versions b where b.artist_id=a.id and b.is_pinned)
          and jsonb_array_length(p.manifest)>0
          and p.public_about->>'version'='1'
          and p.public_about->'identity'->>'name'=coalesce(a.name,'this artist')
          and p.public_about->'identity'->'accounts'=(select coalesce(jsonb_object_agg(key,value),'{}'::jsonb)
            from jsonb_each(to_jsonb(a)) where key in ('instagram','x','tiktok','youtube','youtubechannel','soundcloud','bandcamp','twitch','facebook','spotify','deezer')
              and jsonb_typeof(value)='string' and value<>'""'::jsonb)
          and (p.public_about->>'kind'<>'official' or (
            p.public_about->'ownership'->>'siteName' in ('instagram','x','tiktok','youtube','youtubechannel','soundcloud','bandcamp','twitch','facebook','spotify','deezer')
            and nullif(to_jsonb(a)->>(p.public_about->'ownership'->>'siteName'),'')=p.public_about->'ownership'->>'id'))
          and not exists(select 1 from jsonb_array_elements(p.manifest) original
            left join artist_vault_sources v on v.id=(original->>'id')::uuid and v.artist_id=a.id
            left join artist_source_assessments s on s.source_id=v.id and s.artist_id=a.id and s.activity_id=p.activity_id
            where v.id is null or s.source_id is null or v.status not in ('pending','approved') or v.file_path is not null
              or (public.knowledge_vault_source_snapshot(v)-'status'-'updatedAt')<>(original-'status'-'updatedAt')
              or (s.snapshot-'status'-'updatedAt')<>(original-'status'-'updatedAt'))
          and not exists(select 1 from jsonb_array_elements(p.public_about->'sources') citation
            where not exists(select 1 from jsonb_array_elements(p.manifest) original
              where original->>'id'=citation->>'id' and original->>'url'=citation->>'url'))
        limit 1`);
    return parsePublicArtistAbout(row?.public_about);
}
