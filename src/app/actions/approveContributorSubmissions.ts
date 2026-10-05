'use server';

import { z } from 'zod';
import { requireAdmin } from '@/lib/auth-helpers';
import { approveContributorSubmission } from '@/server/utils/contributions/approveContributorSubmission';
import { queueLoreRefresh } from '@/server/utils/queries/loreRefresh';
import { CONTRIBUTOR_APPROVAL_BATCH, type ContributorSubmission } from '@/lib/contributions/contributorApprovalTypes';

export async function approveContributorSubmissions(contributorId: string, items: ContributorSubmission[]): Promise<{
  success: boolean; approved: number; skipped: number; failed: number; warning?: string; error?: string;
}> {
  let approved = 0, skipped = 0, failed = 0;
  try {
    const auth = await requireAdmin();
    if (!auth.authenticated) return { success: false, approved, skipped, failed, error: 'Admin access required.' };
    const valid = z.object({ contributorId: z.string().uuid(), items: z.array(z.object({
      id: z.string().uuid(), type: z.enum(['link', 'lore', 'upload']),
    })).min(1).max(CONTRIBUTOR_APPROVAL_BATCH) }).safeParse({ contributorId, items });
    if (!valid.success) return { success: false, approved, skipped, failed, error: 'Invalid approval selection. Reload the contributor history.' };
    const refreshes = new Map<string, string | null>();
    const unique = new Map(valid.data.items.map(item => [`${item.type}:${item.id}`, item]));
    for (const item of unique.values()) {
      try {
        const result = await approveContributorSubmission(auth.userId, contributorId, item);
        if (!result) { skipped++; continue; }
        approved++;
        if (result.lore) refreshes.set(result.artistId, result.claimId);
      } catch (error) {
        console.error('[approveContributorSubmissions] Item not approved', { id: item.id, type: item.type, error });
        failed++;
      }
    }
    let refreshFailures = 0;
    for (const [artistId, claimId] of refreshes) {
      try { await queueLoreRefresh(artistId, claimId, { userId: auth.userId, trigger: 'admin_bulk_review' }); }
      catch (error) { refreshFailures++; console.error('[approveContributorSubmissions] Lore enqueue failed', error); }
    }
    return { success: failed === 0, approved, skipped, failed,
      ...(refreshFailures ? { warning: `Approvals saved. Lore refresh could not start for ${refreshFailures} artist(s); use Look again on those profiles to retry.` } : {}) };
  } catch (error) {
    console.error('[approveContributorSubmissions] Review unavailable', error);
    return { success: false, approved, skipped, failed, error: 'Review could not be confirmed. Refresh before retrying.' };
  }
}
