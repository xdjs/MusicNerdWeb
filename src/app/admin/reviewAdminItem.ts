import { approveLinkSuggestion } from '@/lib/admin/approveLinkSuggestion';
import { updateSourceStatus } from '@/app/actions/dashboardActions';
import type { ReviewItem } from '@/lib/contributions/adminReviewTypes';
import { requestAdminApi } from '@/lib/admin/requestAdminApi';

export type ReviewAction = 'approved' | 'rejected' | 'resolved' | 'dismissed';

/** Reuse the existing authorized mutations; never treat resolving a report as approval. */
export async function reviewAdminItem(item: ReviewItem, action: ReviewAction): Promise<void> {
  if (item.type === 'corrections') {
    if (action !== 'resolved' && action !== 'dismissed') throw new Error('Invalid correction action');
    const response = await requestAdminApi(`/api/admin/bio-corrections/${item.id}`, { method: 'PATCH', body: { status: action } });
    if (!response.ok) throw new Error('Could not review this report.');
    return;
  }
  if (action !== 'approved' && action !== 'rejected') throw new Error('Invalid approval action');
  if (item.type === 'links' && action !== 'approved') throw new Error('Link rejection is not supported');
  if (item.type === 'links') return approveLinkSuggestion(item.artistId, item.id);
  const result = await updateSourceStatus(item.id, action, 'pending');
  if (!result.success) throw new Error(result.error || 'Could not review this item.');
}
