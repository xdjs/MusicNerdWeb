'use server';

import { z } from 'zod';
import { requireAdmin } from '@/lib/auth-helpers';
import { LORE_APPROVAL_BATCH, type LoreApprovalResult } from '@/lib/contributions/loreApprovalTypes';
import { approvePendingLoreSource } from '@/server/utils/contributions/approvePendingLoreSource';
import { queueLoreRefresh } from '@/server/utils/queries/loreRefresh';

export async function approveSelectedLoreSources(sourceIds: string[]): Promise<LoreApprovalResult> {
  const approvedIds: string[] = [], skippedIds: string[] = [], failedIds: string[] = [];
  try {
    const auth = await requireAdmin();
    if (!auth.authenticated) return { success: false, approvedIds, skippedIds, failedIds, error: 'Admin access required.' };
    const valid = z.array(z.string().uuid()).min(1).max(LORE_APPROVAL_BATCH).safeParse(sourceIds);
    if (!valid.success) return { success: false, approvedIds, skippedIds, failedIds, error: 'Invalid source selection. Refresh the Lore queue.' };
    const refreshes = new Map<string, string | null>();
    for (const id of new Set(valid.data)) {
      try {
        const result = await approvePendingLoreSource(auth.userId, id);
        if (!result) { skippedIds.push(id); continue; }
        approvedIds.push(id);
        refreshes.set(result.artistId, result.claimId);
      } catch (error) {
        console.error('[approveSelectedLoreSources] Source not approved', { id, error });
        failedIds.push(id);
      }
    }
    let refreshFailures = 0;
    for (const [artistId, claimId] of refreshes) {
      try { await queueLoreRefresh(artistId, claimId, { userId: auth.userId, trigger: 'admin_bulk_review' }); }
      catch (error) { refreshFailures++; console.error('[approveSelectedLoreSources] Lore enqueue failed', error); }
    }
    return { success: failedIds.length === 0, approvedIds, skippedIds, failedIds,
      ...(refreshFailures ? { warning: `Approvals saved. Lore refresh could not start for ${refreshFailures} artist(s); use Look again on those profiles to retry.` } : {}) };
  } catch (error) {
    console.error('[approveSelectedLoreSources] Review unavailable', error);
    return { success: false, approvedIds, skippedIds, failedIds, error: 'Review could not be confirmed. Refresh before retrying.' };
  }
}
