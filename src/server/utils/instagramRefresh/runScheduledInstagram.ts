import { sql } from 'drizzle-orm';
import { db } from '@/server/db/drizzle';
import { APIFY_API_TOKEN, INSTAGRAM_REFRESH_ENABLED } from '@/env';
import { checkInstagramScrape, collectInstagramScrape } from '../socialIngest';
import { completeResearchJob, failResearchJob, saveJobProgress, type ResearchJob } from '../queries/researchJobQueries';
import { startLatestInstagramScrape } from './startLatestInstagramScrape';
import { INSTAGRAM_REFRESH_LIMIT } from './limits';

type Progress = { progress: string; done: boolean; waiting?: boolean };

/** Collection-only jobs: no language model calls or extraction children. */
export async function runScheduledInstagram(job: ResearchJob, deadline: number): Promise<Progress> {
    if (!INSTAGRAM_REFRESH_ENABLED || !APIFY_API_TOKEN) {
        await completeResearchJob(job.id);
        return { progress: 'Scheduled Instagram refresh cancelled: disabled', done: true };
    }
    const reservations = await db.execute(sql`
        select r.started_at, r.run_id, j.state->>'instagramHandle' as handle, j.state->>'since' as since
        from instagram_refresh_reservations r
        join artist_research_jobs j on j.id = r.job_id and j.artist_id = r.artist_id
        join artists a on a.id = j.artist_id
        join artist_claims c on c.artist_id = a.id and c.status = 'approved' and c.id::text = j.state->>'claimId'
        where r.job_id = ${job.id}::uuid
          and lower(trim(leading '@' from btrim(a.instagram))) = j.state->>'instagramHandle'
          and (r.run_id is not null or r.reserved_at > now() - interval '24 hours')`);
    const reservation = reservations[0];
    if (!reservation) {
        await completeResearchJob(job.id);
        return { progress: 'Scheduled refresh cancelled: eligibility changed or reservation expired', done: true };
    }
    let runId = reservation.run_id as string | null;
    if (!runId) {
        if (deadline - Date.now() < 25_000) {
            await saveJobProgress(job.id, job.cursor);
            return { progress: 'Waiting for a full start budget', done: false, waiting: true };
        }
        // Mark first. A lost response or killed invocation must never start a second paid run.
        const marked = await db.execute(sql`
            update instagram_refresh_reservations set started_at = now()
            where job_id = ${job.id}::uuid and started_at is null
              and reserved_at > now() - interval '24 hours'
              and exists (select 1 from artist_research_jobs j
                join artists a on a.id = j.artist_id
                join artist_claims c on c.artist_id = a.id and c.status = 'approved'
                where j.id = ${job.id}::uuid and c.id::text = j.state->>'claimId'
                  and lower(trim(leading '@' from btrim(a.instagram))) = j.state->>'instagramHandle')
            returning job_id`);
        if (!marked.length) {
            await db.execute(sql`update artist_research_jobs set status = 'failed', claimed_at = null,
                last_error = 'Provider start uncertain; reserved budget retained, no automatic restart', updated_at = now()
                where id = ${job.id}::uuid`);
            return { progress: 'Provider start uncertain; no paid retry', done: true };
        }
        runId = await startLatestInstagramScrape(String(reservation.handle), String(reservation.since));
        if (!runId) {
            await db.execute(sql`update artist_research_jobs set status = 'failed', claimed_at = null,
                last_error = 'Provider start failed or uncertain; no automatic restart', updated_at = now()
                where id = ${job.id}::uuid`);
            return { progress: 'Provider start failed; no paid retry', done: true };
        }
        await db.execute(sql`update instagram_refresh_reservations set run_id = ${runId} where job_id = ${job.id}::uuid`);
        await saveJobProgress(job.id, job.cursor);
        return { progress: 'Bounded Instagram check started', done: false, waiting: true };
    }
    const state = await checkInstagramScrape(runId);
    if (state.status === 'started' || state.status === 'running') {
        await saveJobProgress(job.id, job.cursor);
        return { progress: 'Instagram check running', done: false, waiting: true };
    }
    if (state.status === 'failed') {
        await failResearchJob(job.id, 'Scheduled Instagram run unavailable; reusing existing run only');
        return { progress: 'Instagram check unavailable', done: false, waiting: true };
    }
    if (deadline - Date.now() < 45_000) {
        await saveJobProgress(job.id, job.cursor);
        return { progress: 'Waiting for a full collection budget', done: false, waiting: true };
    }
    const result = await collectInstagramScrape(job.artistId, String(reservation.handle), state.datasetId, job.id, 0,
        { limit: INSTAGRAM_REFRESH_LIMIT, since: String(reservation.since) });
    if (result === null) {
        await failResearchJob(job.id, 'Scheduled Instagram collection failed; retry existing dataset');
        return { progress: 'Collection failed', done: false, waiting: true };
    }
    await completeResearchJob(job.id);
    return { progress: `Refreshed ${result.ingested} recent Instagram post(s)`, done: true };
}
