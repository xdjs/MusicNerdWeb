import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/server/db/drizzle';
import { isThumbnailPreviewTest } from './isThumbnailPreviewTest';

/** Temporary exact-artifact cancellation. No worker, fetch, source write or AI. */
export async function cancelThumbnailTestJob(userId: string) {
  const artistId = '50f23458-df64-4381-8042-7333e8b64531';
  const jobId = 'e7a054cc-93a3-4d1d-921e-c2ff3ad119bc';
  const url = 'https://peterango.com/projects/dead-set-fc';
  const marker = 'Cancelled: deleted thumbnail preview test source';
  if (!isThumbnailPreviewTest(artistId, url, true)) throw new Error('Preview cleanup scope unavailable');
  return db.transaction(async tx => {
    const artists = await tx.execute(sql`select id from artists where id=${artistId}::uuid for update`);
    if (artists.length !== 1) throw new Error('Test artist unavailable');
    const claims = await tx.execute(sql`select id,user_id from artist_claims where artist_id=${artistId}::uuid and status='approved'`);
    if (claims.length !== 1 || claims[0].user_id !== userId) throw new Error('Current approved owner required');
    const rows = await tx.execute(sql`select artist_id,kind,status,cursor,total,state,last_error from artist_research_jobs where id=${jobId}::uuid for update`);
    const job = rows[0];
    if (!job || job.artist_id !== artistId || job.kind !== 'source_extract' || job.cursor !== 0 || job.total !== 1) throw new Error('Test job identity or progress changed');
    const state = z.object({version:z.literal(2),autoSourceId:z.string().uuid(),expectedClaimId:z.string().uuid(),sources:z.array(z.object({id:z.string().uuid(),url:z.literal(url)})).length(1),outcomes:z.array(z.unknown()).length(0)}).parse(job.state);
    if (state.autoSourceId !== state.sources[0].id || state.expectedClaimId !== claims[0].id) throw new Error('Source or claim binding changed');
    const sources = await tx.execute(sql`select id from artist_vault_sources where id=${state.autoSourceId}::uuid or (artist_id=${artistId}::uuid and url=${url})`);
    if (sources.length) throw new Error('Test source still exists');
    if (job.status === 'done' && job.last_error === marker) return {jobId,sourceId:state.autoSourceId,status:'already_cancelled' as const};
    if (!['queued','pending'].includes(String(job.status))) throw new Error('Refusing running or terminal job');
    if (!isThumbnailPreviewTest(artistId, url, true)) throw new Error('Preview cleanup scope changed');
    const changed = await tx.execute(sql`update artist_research_jobs set status='done',claimed_at=null,last_error=${marker},updated_at=now() where id=${jobId}::uuid and artist_id=${artistId}::uuid and kind='source_extract' and status in ('queued','pending') returning id`);
    if (changed.length !== 1) throw new Error('Test job changed');
    return {jobId,sourceId:state.autoSourceId,status:'cancelled' as const};
  });
}
