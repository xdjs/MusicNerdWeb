import { sql } from 'drizzle-orm';
import { db } from '@/server/db/drizzle';
import { recordArtistActivity } from '@/server/utils/activity/recordArtistActivity';
import { approveUGC } from '@/server/utils/queries/approveUGC';
import { approvePendingLoreSource } from './approvePendingLoreSource';
import type { ContributorSubmission } from '@/lib/contributions/contributorApprovalTypes';

/** A short atomic write: the reviewer, contributor and pending state are all rechecked. */
export async function approveContributorSubmission(adminId: string, contributorId: string, item: ContributorSubmission) {
  if (item.type !== 'link') return approvePendingLoreSource(adminId, item.id, contributorId);
  return db.transaction(async tx => {
    const [admin] = await tx.execute(sql`select is_admin from users where id = ${adminId}::uuid for share`);
    if (!admin?.is_admin) throw new Error('Admin access required.');

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
  });
}
