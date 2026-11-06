import { sql } from 'drizzle-orm';
import { db } from '@/server/db/drizzle';
import type { DocSource } from '@/server/utils/knowledgeDocMarkdown';
import { vaultSourceRevision } from './vaultSourceRevision';
import { publicKnowledgeUrl } from './publicKnowledgeUrl';

/** Public export only: one snapshot checks claim, privacy and the document's exact recorded evidence. */
export async function getPublicArtistDoc(artistId: string, reader: Pick<typeof db, 'execute'> = db) {
    const rows = await reader.execute(sql`
        select d.content,d.sources,d.updated_at as "updatedAt",
          coalesce((select jsonb_agg(jsonb_build_object(
            'id',v.id,'url',v.url,'activityId',v.activity_id,'origin',v.origin,
            'publication',v.publication,'extractedText',v.extracted_text,'title',v.title,
            'snippet',v.snippet,'publishedAt',v.published_at,'filePath',v.file_path))
            from artist_vault_sources v where v.artist_id=d.artist_id
              and v.status='approved' and v.publication in ('inherit','public')), '[]'::jsonb) as evidence
        from artist_docs d where d.artist_id=${artistId}::uuid
          and exists(select 1 from artist_claims c where c.artist_id=d.artist_id and c.status='approved')
        limit 1
    `);
    const row = (rows as unknown as {
        content: string; sources: unknown; updatedAt: string | null;
        evidence: Parameters<typeof vaultSourceRevision>[0][];
    }[])[0];
    if (!row?.content?.trim() || !Array.isArray(row.sources) || !row.sources.length) return null;
    for (const source of row.sources) {
        if (!source || typeof source !== 'object' || !['vault', 'social', 'interview'].includes(source.kind)) return null;
        if (source.url !== null && (typeof source.url !== 'string' || !publicKnowledgeUrl(source.url))) return null;
        if (source.kind === 'vault' && (typeof source.revision !== 'string'
            || !row.evidence.some(current => current.url === source.url && vaultSourceRevision(current) === source.revision))) return null;
    }
    return { content: row.content, sources: row.sources as DocSource[], updatedAt: row.updatedAt };
}
