import { sql } from 'drizzle-orm';
import type { db } from '@/server/db/drizzle';

/** Read after the artist review lock; include hidden anchors and all pages of results. */
export async function getApprovedWebsiteInventory(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], artistId: string) {
  const rows = await tx.execute(sql`select url from artist_vault_sources
    where artist_id=${artistId}::uuid and status='approved' and type='website' and podcast_episode_key is null`);
  return rows.map(row => ({ url: String(row.url), type: 'website', status: 'approved' }));
}
