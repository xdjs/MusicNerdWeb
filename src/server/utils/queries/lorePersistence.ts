import { db } from '@/server/db/drizzle';
import { artistClaims, artistDocs, artistResearchJobs } from '@/server/db/schema';
import { and, eq, inArray, sql } from 'drizzle-orm';

/** Capture before reading sources; a replacement claim is a new generation. */
export async function getLoreClaimGeneration(artistId: string): Promise<string | null> {
    const claim = await db.query.artistClaims.findFirst({
        where: and(eq(artistClaims.artistId, artistId), eq(artistClaims.status, 'approved')),
    });
    return claim?.id ?? null;
}

export async function persistRefreshedLore(artistId: string, content: string, sources: unknown[],
    expectedClaimId: string | null, jobId?: string): Promise<boolean> {
    return db.transaction(async tx => {
        // Revocation uses this same lock. Either we commit first and its cleanup
        // removes the doc, or we observe its invalidation and write nothing.
        await tx.execute(sql`select id from artists where id = ${artistId}::uuid for update`);
        const claim = await tx.query.artistClaims.findFirst({
            where: and(eq(artistClaims.artistId, artistId), eq(artistClaims.status, 'approved')),
        });
        if ((claim?.id ?? null) !== expectedClaimId) return false;
        if (jobId) {
            const job = await tx.query.artistResearchJobs.findFirst({
                where: and(eq(artistResearchJobs.id, jobId), eq(artistResearchJobs.artistId, artistId),
                    eq(artistResearchJobs.kind, 'lore_refresh'), inArray(artistResearchJobs.status, ['pending', 'running'])),
            });
            if (!job) return false;
        }
        await tx.insert(artistDocs).values({ artistId, content, sources }).onConflictDoUpdate({
            target: [artistDocs.artistId],
            set: { content, sources, updatedAt: sql`(now() AT TIME ZONE 'utc'::text)` },
        });
        return true;
    });
}
