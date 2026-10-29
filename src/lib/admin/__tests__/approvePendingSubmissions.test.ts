import { requestAdminApi } from '../requestAdminApi';
import { approvePendingSubmissions } from '../approvePendingSubmissions';

jest.mock('../requestAdminApi', () => ({ requestAdminApi: jest.fn() }));
const request = requestAdminApi as jest.Mock;
const respond = (ok: boolean, body: unknown) => request.mockResolvedValue({ ok, json: async () => body });
beforeEach(() => jest.clearAllMocks());

it('approves the batch and returns the counts', async () => {
  respond(true, { status: 'ok', approved: 1, skipped: 1, failed: 0, warning: 'w' });
  const items = [{ id: 'g1', type: 'link' as const }, { id: 's1', type: 'lore' as const }];
  expect(await approvePendingSubmissions('u1', items)).toEqual({ approved: 1, skipped: 1, failed: 0, warning: 'w' });
  expect(request).toHaveBeenCalledWith('/api/admin/users/u1/submissions/approve', { method: 'POST', body: { items } });
});
it('throws the API error', async () => {
  respond(false, { status: 'error', error: 'Invalid approval selection' });
  await expect(approvePendingSubmissions('u1', [{ id: 'g1', type: 'link' }])).rejects.toThrow('Invalid approval selection');
});
