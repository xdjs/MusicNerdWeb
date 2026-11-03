import { readAdminApi } from '../readAdminApi';
import { requestAdminApi } from '../requestAdminApi';

jest.mock('../requestAdminApi', () => ({ requestAdminApi: jest.fn() }));
const request = requestAdminApi as jest.Mock;
beforeEach(() => jest.clearAllMocks());

it('returns the JSON body of an admin GET', async () => {
  request.mockResolvedValue({ ok: true, status: 200, json: async () => ({ status: 'ok', users: [] }) });
  await expect(readAdminApi('/api/admin/users')).resolves.toEqual({ status: 'ok', users: [] });
  expect(request).toHaveBeenCalledWith('/api/admin/users');
});

it('throws with the response status when the read fails', async () => {
  request.mockResolvedValue({ ok: false, status: 404, json: async () => ({ status: 'error' }) });
  await expect(readAdminApi('/api/admin/contributions?userId=x')).rejects.toMatchObject({ status: 404 });
});
