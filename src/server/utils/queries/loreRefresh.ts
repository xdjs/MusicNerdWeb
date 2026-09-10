import { db } from '@/server/db/drizzle';
import { sql } from 'drizzle-orm';
import { artistClaims } from '@/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { OwnershipChangedError } from './ownershipWrites';

/** A request arriving during a rebuild must be processed after that snapshot. */
export async function queueLoreRefresh(artistId: string, expectedClaimId: string | null, opts?: { manual: boolean }): Promise<boolean> {
    return db.transaction(async tx => {
    await tx.execute(sql`select id from artists where id = ${artistId}::uuid for update`);
    const claim = await tx.query.artistClaims.findFirst({ where: and(eq(artistClaims.artistId, artistId), eq(artistClaims.status, 'approved')) });
    if ((claim?.id ?? null) !== expectedClaimId) throw new OwnershipChangedError();
    // Serialize manual requests with the enqueue itself. Active work is already
    // sufficient; a repeated click must not advance requestedAt and rerun Gemini.
    // Source-change invalidations deliberately bypass this manual-only limit.
    if (opts?.manual) {
        const recent = await tx.execute(sql`
            select id from artist_research_jobs
            where artist_id = ${artistId}::uuid and kind = 'lore_refresh'
              and (status in ('pending', 'running') or created_at > now() - interval '30 minutes')
            limit 1`);
        if (recent.length > 0) return false;
    }
    await tx.execute(sql`
        insert into artist_research_jobs (artist_id, kind, state)
        values (${artistId}::uuid, 'lore_refresh', ${JSON.stringify({ claimId: expectedClaimId })}::jsonb)
        on conflict (artist_id, kind) where status in ('pending', 'running') do update
        set state = jsonb_set(${JSON.stringify({ claimId: expectedClaimId })}::jsonb,
                '{requestedAt}', to_jsonb(clock_timestamp()::text)),
            status = case when artist_research_jobs.status = 'running' then 'running' else 'pending' end,
            attempts = 0, updated_at = now()`);
    return true;
    });
}
