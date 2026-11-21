import { decideConsent } from '../decideConsent';
import { requestUserApi } from '@/lib/user/requestUserApi';

jest.mock('@/lib/user/requestUserApi', () => ({ requestUserApi: jest.fn() }));
const request = requestUserApi as jest.Mock;
beforeEach(() => jest.clearAllMocks());

const query = 'response_type=code&client_id=c1&redirect_uri=http%3A%2F%2F127.0.0.1%3A33418%2Fcallback&code_challenge=x&code_challenge_method=S256&state=s1';

it('posts the request query with the decision and returns the redirect URL the API chose', async () => {
  request.mockResolvedValue(new Response(JSON.stringify({ status: 'ok', redirectUrl: 'http://127.0.0.1:33418/callback?code=c&state=s1' })));
  await expect(decideConsent(query, 'approve')).resolves.toBe('http://127.0.0.1:33418/callback?code=c&state=s1');
  expect(request).toHaveBeenCalledWith('/api/oauth/consent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      response_type: 'code', client_id: 'c1', redirect_uri: 'http://127.0.0.1:33418/callback',
      code_challenge: 'x', code_challenge_method: 'S256', state: 's1', decision: 'approve',
    }),
  });
});
it('sends a denial', async () => {
  request.mockResolvedValue(new Response(JSON.stringify({ status: 'ok', redirectUrl: 'http://127.0.0.1:33418/callback?error=access_denied' })));
  await decideConsent(query, 'deny');
  expect(JSON.parse(request.mock.calls[0][1].body).decision).toBe('deny');
});
it('throws the API error when the decision is refused', async () => {
  request.mockResolvedValue(new Response(JSON.stringify({ status: 'error', error: 'Not signed in' }), { status: 401 }));
  await expect(decideConsent(query, 'approve')).rejects.toThrow('Not signed in');
});
