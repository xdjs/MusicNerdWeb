import { and, eq, ne, sql } from 'drizzle-orm';
import { db } from '@/server/db/drizzle';
import { artistVaultSources } from '@/server/db/schema';
import { getActiveArtistOperation } from '@/server/utils/artistOperationContext';
import { recordArtistActivity } from '@/server/utils/activity/recordArtistActivity';
import { queueApprovedSourceExtraction } from '@/server/utils/source/queueApprovedSourceExtraction';
import { lockScopedArtistWrite } from './ownershipWrites';

/** The approval, attribution and missing-original job commit together. */
export async function updateVaultSourceStatus(sourceId: string, status: 'approved' | 'rejected', expectedStatus?: 'pending') {
  return db.transaction(async tx => {
    const scope = getActiveArtistOperation();
    let artistId = scope?.artistId;
    if (scope) await lockScopedArtistWrite(tx, scope.artistId);
    else {
      const [source] = await tx.execute(sql`select artist_id from artist_vault_sources where id=${sourceId}::uuid`);
      if (!source) return undefined;
      artistId = String(source.artist_id);
      await tx.execute(sql`select id from artists where id=${artistId}::uuid for update`);
    }
    const [row] = await tx.update(artistVaultSources).set({ status, updatedAt: sql`now()` })
      .where(and(eq(artistVaultSources.id, sourceId),
        eq(artistVaultSources.artistId, artistId!),
        expectedStatus ? eq(artistVaultSources.status, expectedStatus) : ne(artistVaultSources.status, status)))
      .returning();
    if (!row) return undefined;
    const activityId = await recordArtistActivity(row.artistId, `source_${status}`, { sourceId }, tx);
    await queueApprovedSourceExtraction(tx, row, activityId);
    return row;
  });
}
