import { sql } from 'drizzle-orm';
import { db } from '@/server/db/drizzle';
import { recordArtistActivity } from '@/server/utils/activity/recordArtistActivity';
import { queueUnitSync } from '@/server/utils/units/queueUnitSync';

/** Admin publication decision only: no ownership, onboarding, notifications or research jobs. */
export async function setSourcePublication(adminId: string, input: {
  sourceId: string; publication: 'inherit' | 'public' | 'private'; expectedUpdatedAt: string | null;
}) {
  let changed = false;
  const result = await db.transaction(async tx => {
    const [admin] = await tx.execute(sql`select is_admin from users where id=${adminId}::uuid for share`);
    if (!admin?.is_admin) throw new Error('Admin access required.');
    const [candidate] = await tx.execute(sql`select artist_id from artist_vault_sources where id=${input.sourceId}::uuid`);
    if (!candidate) throw new Error('Source not found.');
    const artistId = String(candidate.artist_id);
    await tx.execute(sql`select id from artists where id=${artistId}::uuid for update`);
    const [source] = await tx.execute(sql`
      select publication from artist_vault_sources where id=${input.sourceId}::uuid and artist_id=${artistId}::uuid
        and status='approved' and updated_at is not distinct from ${input.expectedUpdatedAt}::timestamptz for update`);
    if (!source) throw new Error('Source changed or is not approved.');
    if (source.publication !== input.publication) {
      await tx.execute(sql`update artist_vault_sources set publication=${input.publication},updated_at=now()
        where id=${input.sourceId}::uuid and artist_id=${artistId}::uuid`);
      changed = true;
      await recordArtistActivity(artistId, `source_publication_${input.publication}`, {
        userId: adminId, sourceId: input.sourceId,
        trigger: `admin_publication:${String(source.publication)}->${input.publication}`,
      }, tx);
    }
    return { artistId, sourceId: input.sourceId, publication: input.publication };
  });
  // After commit, never inside it: the API reads the committed revision.
  if (changed) await queueUnitSync(result.artistId).catch(() => false);
  return result;
}
