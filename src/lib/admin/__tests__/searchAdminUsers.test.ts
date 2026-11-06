import { requestAdminApi } from '../requestAdminApi';
import { searchAdminUsers } from '../searchAdminUsers';

jest.mock('../requestAdminApi', () => ({ requestAdminApi: jest.fn() }));
const request = requestAdminApi as jest.Mock;
const respond = (ok: boolean, body: unknown) => request.mockResolvedValue({ ok, json: async () => body });
beforeEach(() => jest.clearAllMocks());

it('returns the users matching the search', async () => {
  const users = [{ id: 'u1', username: 'dutchyyy', wallet: null }];
  respond(true, { status: 'ok', users });
  expect(await searchAdminUsers('dutch & co')).toEqual(users);
  expect(request).toHaveBeenCalledWith('/api/admin/users?search=dutch+%26+co');
});
it('throws the API error', async () => {
  respond(false, { status: 'error', error: 'Forbidden' });
  await expect(searchAdminUsers('dutch')).rejects.toThrow('Forbidden');
});
