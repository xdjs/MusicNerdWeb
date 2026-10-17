import { reviewAdminItem } from '../reviewAdminItem';
import { approveUgcAdminAction } from '@/app/actions/serverActions';
import { updateSourceStatus } from '@/app/actions/dashboardActions';
import type { ReviewItem } from '@/lib/contributions/adminReviewTypes';
jest.mock('@/app/actions/serverActions', () => ({ approveUgcAdminAction: jest.fn() }));
jest.mock('@/app/actions/dashboardActions', () => ({ updateSourceStatus: jest.fn() }));
const item = { id: 'report', type: 'corrections' } as ReviewItem;
beforeEach(() => { jest.clearAllMocks(); global.fetch = jest.fn(); });
it('uses only the correction endpoint when resolving or dismissing a report', async () => {
  (fetch as jest.Mock).mockResolvedValue({ ok: true });
  await reviewAdminItem(item, 'resolved');
  expect(fetch).toHaveBeenCalledWith('/api/admin/bio-corrections/report', expect.objectContaining({ body: JSON.stringify({status:'resolved'}) }));
  expect(approveUgcAdminAction).not.toHaveBeenCalled();
  expect(updateSourceStatus).not.toHaveBeenCalled();
});
it('surfaces unsuccessful correction reviews', async () => {
  (fetch as jest.Mock).mockResolvedValue({ok:false});
  await expect(reviewAdminItem(item,'dismissed')).rejects.toThrow('Could not review');
});
it('rejects invalid cross-type actions before any mutation', async () => {
  await expect(reviewAdminItem(item,'approved')).rejects.toThrow('Invalid correction');
  await expect(reviewAdminItem({...item,type:'links'},'rejected')).rejects.toThrow('not supported');
  await expect(reviewAdminItem({...item,type:'sources'},'resolved')).rejects.toThrow('Invalid approval');
  expect(fetch).not.toHaveBeenCalled();
  expect(approveUgcAdminAction).not.toHaveBeenCalled();
  expect(updateSourceStatus).not.toHaveBeenCalled();
});
it('preserves the pending-status guard for source reviews', async () => {
  (updateSourceStatus as jest.Mock).mockResolvedValue({status:'success'});
  await reviewAdminItem({...item,type:'sources'},'rejected');
  expect(updateSourceStatus).toHaveBeenCalledWith('report','rejected','pending');
});
