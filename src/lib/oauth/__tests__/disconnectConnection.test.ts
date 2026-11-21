import { disconnectConnection } from '../disconnectConnection';
import { requestUserApi } from '@/lib/user/requestUserApi';

jest.mock('@/lib/user/requestUserApi', () => ({ requestUserApi: jest.fn() }));
const request = requestUserApi as jest.Mock;
beforeEach(() => jest.clearAllMocks());

it('deletes the connection by its encoded ID', async () => {
  request.mockResolvedValue(new Response(JSON.stringify({ status: 'ok' })));
  await disconnectConnection('conn/1');
  expect(request).toHaveBeenCalledWith('/api/oauth/connections/conn%2F1', { method: 'DELETE' });
});
it('throws the API error', async () => {
  request.mockResolvedValue(new Response(JSON.stringify({ status: 'error', error: 'Not signed in' }), { status: 401 }));
  await expect(disconnectConnection('conn_1')).rejects.toThrow('Not signed in');
});
