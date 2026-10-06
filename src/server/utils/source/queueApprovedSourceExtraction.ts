import { sql } from 'drizzle-orm';
import type { db } from '@/server/db/drizzle';

/** Queue inside the authorized source mutation's transaction, with the artist locked. */
export async function queueApprovedSourceExtraction(
  writer: Pick<typeof db, 'execute'>,
  source: { id: string; artistId: string; url: string; status: string; filePath?: string | null; extractedText?: string | null },
  activityId: string | null,
): Promise<void> {
  if (source.status !== 'approved' || source.filePath || source.extractedText?.trim() || source.url.length > 8192) return;
  try {
    const url = new URL(source.url);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port) return;
  } catch { return; }
  try {
    const result = await writer.execute(sql`select id from artist_claims where artist_id=${source.artistId}::uuid and status='approved'`);
    const [claim] = Array.isArray(result) ? result : (result as unknown as { rows: { id: string }[] }).rows;
    const expectedClaimId = claim ? String(claim.id) : null;
    // A cancelled claim must not let an old live job absorb the replacement's work.
    await writer.execute(sql`update artist_research_jobs set status='done',claimed_at=null,last_error='Cancelled after ownership changed',updated_at=now()
      where artist_id=${source.artistId}::uuid and kind='source_extract' and status in ('queued','pending','running')
        and state->>'version'='2' and state->>'autoSourceId'=${source.id}
        and state->>'expectedClaimId' is distinct from ${expectedClaimId}::text`);
    const state = { version: 2, autoSourceId: source.id, expectedClaimId,
      sources: [{ id: source.id, url: source.url }], outcomes: [] };
    await writer.execute(sql`insert into artist_research_jobs(artist_id,kind,status,total,state,activity_id)
      values(${source.artistId}::uuid,'source_extract','queued',1,${JSON.stringify(state)}::jsonb,${activityId}::uuid)
      on conflict do nothing`);
  } catch { throw new Error('Source extraction queue unavailable'); }
}
