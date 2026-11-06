import { sql } from 'drizzle-orm';
import { withScopedArtistWrite } from './ownershipWrites';
import { recordArtistActivity } from '../activity/recordArtistActivity';

/** Claim approval queues private preparation; it never offers questions to the artist. */
export async function enqueueClaimInterview(artistId: string, claimId: string, userId: string): Promise<boolean> {
  return withScopedArtistWrite(artistId, async tx => {
    const existing = await tx.execute(sql`select id from artist_research_jobs
      where artist_id=${artistId}::uuid and kind='interview_prepare'
      and state->>'claimId'=${claimId} limit 1`);
    if (Array.from(existing).length) return true;
    const activityId = await recordArtistActivity(artistId, 'interview_prepare', { trigger: 'claim_approval' }, tx);
    const state = { version: 1, mode: 'claim_preparation', claimId, userId, createdAt: new Date().toISOString() };
    const inserted = await tx.execute(sql`insert into artist_research_jobs (artist_id,kind,state,activity_id)
      values (${artistId}::uuid,'interview_prepare',${JSON.stringify(state)}::jsonb,${activityId}::uuid)
      on conflict do nothing returning id`);
    return Array.from(inserted).length > 0;
  });
}
