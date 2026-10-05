import { sql, and, eq } from 'drizzle-orm';
import { db } from '@/server/db/drizzle';
import { artistClaims } from '@/server/db/schema';
import { recordArtistActivity } from '@/server/utils/activity/recordArtistActivity';
import { approveUGC } from '@/server/utils/queries/approveUGC';
import type { ContributorSubmission } from '@/lib/contributions/contributorApprovalTypes';

/** A short atomic write: the reviewer, contributor and pending state are all rechecked. */
export async function approveContributorSubmission(adminId: string, contributorId: string, item: ContributorSubmission) {
  return db.transaction(async tx => {
    const [admin] = await tx.execute(sql`select is_admin from users where id = ${adminId}::uuid for share`);
    if (!admin?.is_admin) throw new Error('Admin access required.');

    if (item.type === 'link') {
      const [link] = await tx.execute(sql`
        select id, artist_id, site_name, site_username from ugcresearch
        where id = ${item.id}::uuid and user_id = ${contributorId}::uuid and origin = 'submission'
          and accepted is not true and date_processed is null and artist_id is not null
          and site_name is distinct from 'ugc_discord_ping' for update
      `);
      if (!link) return null;
      await approveUGC(String(link.id), String(link.artist_id), String(link.site_name ?? ''), String(link.site_username ?? ''), tx);
      await recordArtistActivity(String(link.artist_id), 'link_approved', { userId: adminId, sourceId: item.id, trigger: 'admin_bulk_review' }, tx);
      return { artistId: String(link.artist_id), lore: false as const };
    }

    // Follow the existing moderation lock order: artist before source.
    const [candidate] = await tx.execute(sql`select artist_id from artist_vault_sources where id = ${item.id}::uuid`);
    if (!candidate) return null;
    const artistId = String(candidate.artist_id);
    await tx.execute(sql`select id from artists where id = ${artistId}::uuid for update`);
    const [source] = await tx.execute(sql`
      update artist_vault_sources s set status = 'approved', updated_at = now()
      where s.id = ${item.id}::uuid and s.artist_id = ${artistId}::uuid and s.status = 'pending'
        and s.origin in ('submission', 'upload')
        and exists (select 1 from artist_activity_events e where e.id = s.activity_id and e.actor_user_id = ${contributorId}::uuid)
      returning s.id
    `);
    if (!source) return null;
    await recordArtistActivity(artistId, 'source_approved', { userId: adminId, sourceId: item.id, trigger: 'admin_bulk_review' }, tx);
    const claim = await tx.query.artistClaims.findFirst({ where: and(eq(artistClaims.artistId, artistId), eq(artistClaims.status, 'approved')) });
    return { artistId, lore: true as const, claimId: claim?.id ?? null };
  });
}
