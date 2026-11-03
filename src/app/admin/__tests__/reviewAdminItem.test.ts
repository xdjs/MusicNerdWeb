import { reviewAdminItem } from '../reviewAdminItem';
import { approveLinkSuggestion } from '@/lib/admin/approveLinkSuggestion';
import { reviewLoreSource } from '@/lib/source/reviewLoreSource';
import type { ReviewItem } from '@/lib/contributions/adminReviewTypes';
import { requestAdminApi } from '@/lib/admin/requestAdminApi';
jest.mock('@/lib/admin/approveLinkSuggestion', () => ({ approveLinkSuggestion: jest.fn() }));
jest.mock('@/lib/source/reviewLoreSource', () => ({ reviewLoreSource: jest.fn() }));
jest.mock('@/lib/admin/requestAdminApi', () => ({ requestAdminApi: jest.fn() }));
const request = requestAdminApi as jest.Mock;
const item = { id: 'report', type: 'corrections', artistId: 'artist' } as ReviewItem;
beforeEach(() => { jest.clearAllMocks(); });
it('uses only the correction endpoint when resolving or dismissing a report', async () => {
  request.mockResolvedValue({ ok: true });
  await reviewAdminItem(item, 'resolved');
  expect(request).toHaveBeenCalledWith('/api/admin/bio-corrections/report', { method: 'PATCH', body: { status: 'resolved' } });
  expect(approveLinkSuggestion).not.toHaveBeenCalled();
  expect(reviewLoreSource).not.toHaveBeenCalled();
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
  expect(approveLinkSuggestion).not.toHaveBeenCalled();
  expect(reviewLoreSource).not.toHaveBeenCalled();
});
it('preserves the pending-status guard for source reviews', async () => {
  (reviewLoreSource as jest.Mock).mockResolvedValue({success:true});
  await reviewAdminItem({...item,type:'sources'},'rejected');
  expect(reviewLoreSource).toHaveBeenCalledWith('artist','report','rejected');
});
it('approves a link suggestion on its artist through the API', async () => {
  (approveLinkSuggestion as jest.Mock).mockResolvedValue(undefined);
  await reviewAdminItem({...item,type:'links',id:'ugc',artistId:'artist'},'approved');
  expect(approveLinkSuggestion).toHaveBeenCalledWith('artist','ugc');
  expect(reviewLoreSource).not.toHaveBeenCalled();
});
it('surfaces an unsuccessful source review', async () => {
  (reviewLoreSource as jest.Mock).mockResolvedValue({success:false,error:'Not authorized for this artist'});
  await expect(reviewAdminItem({...item,type:'sources'},'approved')).rejects.toThrow('Not authorized');
});
