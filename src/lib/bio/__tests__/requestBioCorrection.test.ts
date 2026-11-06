import { getAccessToken } from '@privy-io/react-auth';
import { requestBioCorrection } from '../requestBioCorrection';

jest.mock('@privy-io/react-auth', () => ({ getAccessToken: jest.fn() }));
jest.mock('@/lib/musicNerdApi/musicNerdApiUrl', () => ({ musicNerdApiUrl: (path: string) => `https://api-preview.test${path}` }));
const token = getAccessToken as jest.Mock;
const report = { reason: 'incorrect', details: '', sourceUrl: '', expectedBio: 'A published bio' };
beforeEach(() => { jest.clearAllMocks(); token.mockResolvedValue('private-token'); global.fetch = jest.fn().mockResolvedValue({ ok: true }); });

it('POSTs the report to the API with bearer authorization', async () => {
  await requestBioCorrection('a1', report);
  expect(fetch).toHaveBeenCalledWith('https://api-preview.test/api/artist/a1/bio-corrections', {
    method: 'POST', headers: { Authorization: 'Bearer private-token', 'Content-Type': 'application/json' },
    body: JSON.stringify(report), credentials: 'omit', cache: 'no-store',
  });
});
it('does not fall back to a cookie route when Privy has no token', async () => {
  token.mockResolvedValue(null);
  await expect(requestBioCorrection('a1', report)).rejects.toThrow('sign in');
  expect(fetch).not.toHaveBeenCalled();
});
