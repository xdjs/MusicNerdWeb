import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/server/db/drizzle';
import { artistClaims } from '@/server/db/schema';
import { recordArtistActivity } from '@/server/utils/activity/recordArtistActivity';
import { queueApprovedSourceExtraction } from '@/server/utils/source/queueApprovedSourceExtraction';

/** Admin-only pending approval; contributor review additionally restricts origin and credit. */
export async function approvePendingLoreSource(adminId: string, sourceId: string, contributorId?: string) {
  return db.transaction(async tx => {
    const [admin] = await tx.execute(sql`select is_admin from users where id = ${adminId}::uuid for share`);
    if (!admin?.is_admin) throw new Error('Admin access required.');

    // Match individual moderation: lock the artist before changing a source.
    const [candidate] = await tx.execute(sql`select artist_id from artist_vault_sources where id = ${sourceId}::uuid`);
    if (!candidate) return null;
    const artistId = String(candidate.artist_id);
    await tx.execute(sql`select id from artists where id = ${artistId}::uuid for update`);
    const contributorScope = contributorId ? sql`
      and s.origin in ('submission', 'upload')
      and exists (select 1 from artist_activity_events e where e.id = s.activity_id and e.actor_user_id = ${contributorId}::uuid)
    ` : sql``;
    const [source] = await tx.execute(sql`
      update artist_vault_sources s set status = 'approved', updated_at = now()
      where s.id = ${sourceId}::uuid and s.artist_id = ${artistId}::uuid and s.status = 'pending'
        ${contributorScope}
      returning s.id,s.url,s.status,s.file_path,s.extracted_text
    `);
    if (!source) return null;
    const activityId = await recordArtistActivity(artistId, 'source_approved', { userId: adminId, sourceId, trigger: 'admin_bulk_review' }, tx);
    await queueApprovedSourceExtraction(tx, { id: sourceId, artistId, url: String(source.url), status: String(source.status),
      filePath: source.file_path as string | null, extractedText: source.extracted_text as string | null }, activityId);
    const claim = await tx.query.artistClaims.findFirst({ where: and(eq(artistClaims.artistId, artistId), eq(artistClaims.status, 'approved')) });
    return { artistId, lore: true as const, claimId: claim?.id ?? null };
  });
}
