import { requestAdminApi } from '../requestAdminApi';
import { setAdminUserRole } from '../setAdminUserRole';

jest.mock('../requestAdminApi', () => ({ requestAdminApi: jest.fn() }));
const request = requestAdminApi as jest.Mock;
const respond = (ok: boolean, body: unknown) => request.mockResolvedValue({ ok, json: async () => body });
beforeEach(() => jest.clearAllMocks());

it('changes the role for the users and returns the count', async () => {
  respond(true, { status: 'ok', updated: 2 });
  expect(await setAdminUserRole(['u1', 'u2'], 'admin', true)).toBe(2);
  expect(request).toHaveBeenCalledWith('/api/admin/users', { method: 'PATCH', body: { userIds: ['u1', 'u2'], role: 'admin', enabled: true } });
});
it('throws the API error', async () => {
  respond(false, { status: 'error', error: 'Invalid role change' });
  await expect(setAdminUserRole(['u1'], 'hidden', false)).rejects.toThrow('Invalid role change');
});
