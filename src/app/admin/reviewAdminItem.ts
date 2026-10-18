import { approveUgcAdminAction } from '@/app/actions/serverActions';
import { updateSourceStatus } from '@/app/actions/dashboardActions';
import type { ReviewItem } from '@/lib/contributions/adminReviewTypes';

export type ReviewAction = 'approved' | 'rejected' | 'resolved' | 'dismissed';

/** Reuse the existing authorized mutations; never treat resolving a report as approval. */
export async function reviewAdminItem(item: ReviewItem, action: ReviewAction): Promise<void> {
  if (item.type === 'corrections') {
    if (action !== 'resolved' && action !== 'dismissed') throw new Error('Invalid correction action');
    const response = await fetch(`/api/admin/bio-corrections/${item.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: action }),
    });
    if (!response.ok) throw new Error('Could not review this report.');
    return;
  }
  if (action !== 'approved' && action !== 'rejected') throw new Error('Invalid approval action');
  if (item.type === 'links' && action !== 'approved') throw new Error('Link rejection is not supported');
  const result = item.type === 'links'
    ? await approveUgcAdminAction([item.id])
    : await updateSourceStatus(item.id, action, 'pending');
  const success = 'success' in result ? result.success : result.status === 'success';
  if (!success) throw new Error(('error' in result ? result.error : 'message' in result ? result.message : undefined) || 'Could not review this item.');
}
