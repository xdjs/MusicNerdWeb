import { sql } from 'drizzle-orm';
import { db } from '@/server/db/drizzle';
import { INSTAGRAM_REFRESH_BUDGET_CENTS, INSTAGRAM_REFRESH_CENTS, INSTAGRAM_REFRESH_DAILY_RUNS } from './limits';

/** Budget reservation and enqueue are one transaction, serialized across cron retries. */
export async function queueScheduledInstagram(): Promise<number> {
    return db.transaction(async tx => {
        await tx.execute(sql`select pg_advisory_xact_lock(1376, 1)`);
        const result = await tx.execute(sql`
            with budget as (
                select least(
                    ${INSTAGRAM_REFRESH_DAILY_RUNS} - count(*) filter (
                        where reserved_at >= date_trunc('day', now() at time zone 'UTC') at time zone 'UTC'),
                    (${INSTAGRAM_REFRESH_BUDGET_CENTS} - coalesce(sum(reserved_cents), 0)) / ${INSTAGRAM_REFRESH_CENTS}
                )::integer as slots
                from instagram_refresh_reservations where reserved_at > now() - interval '32 days'
            ), candidates as (
                select a.id, c.id as claim_id, lower(trim(leading '@' from btrim(a.instagram))) as handle,
                    greatest(now() - interval '7 days', p.newest - interval '24 hours') as since
                from artists a
                join artist_claims c on c.artist_id = a.id and c.status = 'approved'
                join lateral (
                    select max(posted_at) as newest from artist_social_posts
                    where artist_id = a.id and platform = 'instagram' and is_own_post = true
                      and lower(owner_username) = lower(trim(leading '@' from btrim(a.instagram)))
                      and posted_at <= now()
                ) p on p.newest is not null
                left join lateral (
                    select max(reserved_at) as last_check from instagram_refresh_reservations where artist_id = a.id
                ) r on true
                where lower(trim(leading '@' from btrim(a.instagram))) ~ '^[a-z0-9._]{1,30}$'
                  and (r.last_check is null or r.last_check < date_trunc('day', now() at time zone 'UTC') at time zone 'UTC')
                  and not exists (select 1 from artist_research_jobs j where j.artist_id = a.id
                    and j.kind in ('social_ingest', 'caption_extract') and j.status in ('pending', 'running'))
                order by r.last_check asc nulls first, a.id
                limit (select greatest(0, slots) from budget)
                for update of a skip locked
            ), queued as (
                insert into artist_research_jobs (artist_id, kind, state)
                select id, 'social_ingest', jsonb_build_object('scheduledInstagram', true,
                    'claimId', claim_id, 'instagramHandle', handle, 'since', since)
                from candidates on conflict do nothing
                returning id, artist_id, state
            )
            insert into instagram_refresh_reservations (job_id, artist_id, reserved_cents)
            select id, artist_id, ${INSTAGRAM_REFRESH_CENTS} from queued returning job_id`);
        return result.length;
    });
}
