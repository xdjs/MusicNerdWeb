import { z } from 'zod';
import { callPrivateResearch } from '@/lib/questionResearch/callPrivateResearch';
import { authorizeThumbnailQueueRead } from '@/app/actions/authorizeThumbnailQueueRead';

/** Temporary read-only preview diagnostic. Never calls an advance/refresh endpoint. */
export async function readThumbnailTestJobs(artistId: string) {
  const job = z.object({ jobId: z.string().uuid(), kind: z.string(),
    status: z.enum(['queued', 'pending', 'running', 'done', 'failed']),
    cursor: z.number().int().nonnegative(), total: z.number().int().nonnegative().nullable() });
  const page = z.object({ status: z.literal('ok'), jobs: z.array(job).max(50),
    budget: z.object({ nextCursor: z.string().max(4096).nullable(), truncated: z.boolean() }) });
  const jobs: z.infer<typeof job>[] = [];
  const seen = new Set<string>();
  let cursor: string | null = null;
  for (let count = 0; count < 20; count++) {
    if (await authorizeThumbnailQueueRead() !== artistId) throw new Error('Test scope expired or unauthorized');
    const result = page.parse(await callPrivateResearch(
      `/api/artist/${encodeURIComponent(artistId)}/research/status?limit=50${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
    ));
    jobs.push(...result.jobs.filter(value => value.kind === 'source_extract'));
    cursor = result.budget.nextCursor;
    if (!cursor && !result.budget.truncated) return jobs;
    if (!cursor || seen.has(cursor)) throw new Error('Incomplete queue inventory');
    seen.add(cursor);
  }
  throw new Error('Incomplete queue inventory');
}
