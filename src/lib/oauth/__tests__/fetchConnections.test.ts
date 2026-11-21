import { fetchConnections } from '../fetchConnections';
import { requestUserApi } from '@/lib/user/requestUserApi';

jest.mock('@/lib/user/requestUserApi', () => ({ requestUserApi: jest.fn() }));
const request = requestUserApi as jest.Mock;
beforeEach(() => jest.clearAllMocks());

const connection = { id: 'conn_1', agent: 'Claude', scopes: ['mcp:tools'], connectedAt: '2026-11-20T18:02:11.000Z', lastUsedAt: null };

it("returns the member's connections", async () => {
  request.mockResolvedValue(new Response(JSON.stringify({ status: 'ok', connections: [connection] })));
  await expect(fetchConnections()).resolves.toEqual([connection]);
  expect(request).toHaveBeenCalledWith('/api/oauth/connections');
});
it('throws the API error', async () => {
  request.mockResolvedValue(new Response(JSON.stringify({ status: 'error', error: 'Not signed in' }), { status: 401 }));
  await expect(fetchConnections()).rejects.toThrow('Not signed in');
});
