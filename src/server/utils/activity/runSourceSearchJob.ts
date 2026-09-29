import { db } from '@/server/db/drizzle';
import { artistActivityEvents } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import type { ResearchJob } from '../queries/researchJobQueries';
import { completeResearchJob, saveJobProgress } from '../queries/researchJobQueries';
import { withArtistOperation } from '../artistOperationContext';
import { searchAndPopulateVault } from '../queries/vaultWebSearch';

/** Claim-approval discovery survives the request and retains the approving admin. */
export async function runSourceSearchJob(job: ResearchJob, deadline: number) {
  if (deadline - Date.now() < 30_000) {
    await saveJobProgress(job.id, job.cursor);
    return { progress: 'Waiting for a full research slice', done: false, waiting: true };
  }
  if (!job.activityId) throw new Error('Source research is missing its initiating event');
  const [event] = await db.select().from(artistActivityEvents).where(eq(artistActivityEvents.id, job.activityId)).limit(1);
  if (!event || event.artistId !== job.artistId) throw new Error('Invalid research attribution');
  if (event.actorKind === 'user' && !event.actorUserId) {
    await completeResearchJob(job.id);
    return { progress: 'Research cancelled: initiating account was deleted', done: true };
  }
  const sources = await withArtistOperation(job.artistId, {
    userId: event.actorUserId ?? undefined,
    expectedClaimId: typeof job.state.claimId === 'string' ? job.state.claimId : null,
    trigger: event.trigger, activityId: event.id, sourceOrigin: 'research',
  }, () => searchAndPopulateVault(job.artistId, { deadline, requireComplete: true }));
  await completeResearchJob(job.id);
  return { progress: `Source search finished, ${sources.length} sources added`, done: true };
}
