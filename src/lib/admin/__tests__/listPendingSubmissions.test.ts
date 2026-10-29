import { requestAdminApi } from '../requestAdminApi';
import { listPendingSubmissions } from '../listPendingSubmissions';

jest.mock('../requestAdminApi', () => ({ requestAdminApi: jest.fn() }));
const request = requestAdminApi as jest.Mock;
const respond = (ok: boolean, body: unknown) => request.mockResolvedValue({ ok, json: async () => body });
beforeEach(() => jest.clearAllMocks());

it("returns the contributor's pending submissions", async () => {
  const items = [{ id: 'g1', type: 'link', title: 'instagram', url: null, artistName: 'Dutchyyy' }];
  respond(true, { status: 'ok', items, hasMore: true });
  expect(await listPendingSubmissions('u 1')).toEqual({ items, hasMore: true });
  expect(request).toHaveBeenCalledWith('/api/admin/users/u%201/submissions');
});
it('throws the API error', async () => {
  respond(false, { status: 'error', error: 'Invalid user ID' });
  await expect(listPendingSubmissions('u1')).rejects.toThrow('Invalid user ID');
});
