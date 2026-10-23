import { reviewAdminItem } from '../reviewAdminItem';
import { approveUgcAdminAction } from '@/app/actions/serverActions';
import { updateSourceStatus } from '@/app/actions/dashboardActions';
import type { ReviewItem } from '@/lib/contributions/adminReviewTypes';
import { requestAdminApi } from '@/lib/admin/requestAdminApi';
jest.mock('@/app/actions/serverActions', () => ({ approveUgcAdminAction: jest.fn() }));
jest.mock('@/app/actions/dashboardActions', () => ({ updateSourceStatus: jest.fn() }));
jest.mock('@/lib/admin/requestAdminApi', () => ({ requestAdminApi: jest.fn() }));
const request = requestAdminApi as jest.Mock;
const item = { id: 'report', type: 'corrections' } as ReviewItem;
beforeEach(() => { jest.clearAllMocks(); });
it('uses only the correction endpoint when resolving or dismissing a report', async () => {
  request.mockResolvedValue({ ok: true });
  await reviewAdminItem(item, 'resolved');
  expect(request).toHaveBeenCalledWith('/api/admin/bio-corrections/report', { method: 'PATCH', body: { status: 'resolved' } });
  expect(approveUgcAdminAction).not.toHaveBeenCalled();
  expect(updateSourceStatus).not.toHaveBeenCalled();
});
it('surfaces unsuccessful correction reviews', async () => {
  request.mockResolvedValue({ok:false});
  await expect(reviewAdminItem(item,'dismissed')).rejects.toThrow('Could not review');
});
it('rejects invalid cross-type actions before any mutation', async () => {
  await expect(reviewAdminItem(item,'approved')).rejects.toThrow('Invalid correction');
  await expect(reviewAdminItem({...item,type:'links'},'rejected')).rejects.toThrow('not supported');
  await expect(reviewAdminItem({...item,type:'sources'},'resolved')).rejects.toThrow('Invalid approval');
  expect(request).not.toHaveBeenCalled();
  expect(approveUgcAdminAction).not.toHaveBeenCalled();
  expect(updateSourceStatus).not.toHaveBeenCalled();
});
it('preserves the pending-status guard for source reviews', async () => {
  (updateSourceStatus as jest.Mock).mockResolvedValue({status:'success'});
  await reviewAdminItem({...item,type:'sources'},'rejected');
  expect(updateSourceStatus).toHaveBeenCalledWith('report','rejected','pending');
});
