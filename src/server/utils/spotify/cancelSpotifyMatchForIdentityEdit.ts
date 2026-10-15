import { sql } from 'drizzle-orm';
import type { db } from '@/server/db/drizzle';

/** Persist explicit edits/removals so an old job cannot restore a removed identity. */
export async function cancelSpotifyMatchForIdentityEdit(writer: Pick<typeof db, 'execute'>, artistId: string): Promise<void> {
  await writer.execute(sql`update artist_research_jobs
    set status='done',claimed_at=null,last_error=null,updated_at=now(),
      state=state || '{"identityChanged":true,"outcome":"identity_changed"}'::jsonb
    where artist_id=${artistId}::uuid and kind='spotify_match' and status in ('pending','running')`);
}
