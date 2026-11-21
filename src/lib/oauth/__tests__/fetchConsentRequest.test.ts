import { fetchConsentRequest } from '../fetchConsentRequest';
import { requestUserApi } from '@/lib/user/requestUserApi';

jest.mock('@/lib/user/requestUserApi', () => ({ requestUserApi: jest.fn() }));
const request = requestUserApi as jest.Mock;
beforeEach(() => jest.clearAllMocks());

it('reads the request with the same query and returns the agent', async () => {
  request.mockResolvedValue(new Response(JSON.stringify({ status: 'ok', agent: 'Claude', redirectHost: '127.0.0.1:33418' })));
  await expect(fetchConsentRequest('response_type=code&client_id=c1')).resolves.toEqual({ status: 'ok', agent: 'Claude', redirectHost: '127.0.0.1:33418' });
  expect(request).toHaveBeenCalledWith('/api/oauth/consent?response_type=code&client_id=c1');
});
it('throws the API error for an invalid request', async () => {
  request.mockResolvedValue(new Response(JSON.stringify({ status: 'error', error: 'Invalid authorization request' }), { status: 400 }));
  await expect(fetchConsentRequest('client_id=nope')).rejects.toThrow('Invalid authorization request');
});
