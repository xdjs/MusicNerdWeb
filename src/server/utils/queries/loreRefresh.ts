import { db } from '@/server/db/drizzle';
import { sql } from 'drizzle-orm';

/** A request arriving during a rebuild must be processed after that snapshot. */
export async function queueLoreRefresh(artistId: string): Promise<void> {
    await db.execute(sql`
        insert into artist_research_jobs (artist_id, kind, state)
        values (${artistId}::uuid, 'lore_refresh', '{}'::jsonb)
        on conflict (artist_id, kind) where status in ('pending', 'running') do update
        set state = jsonb_set(coalesce(artist_research_jobs.state, '{}'::jsonb),
                '{requestedAt}', to_jsonb(clock_timestamp()::text)),
            status = case when artist_research_jobs.status = 'running' then 'running' else 'pending' end,
            attempts = 0, updated_at = now()`);
}
