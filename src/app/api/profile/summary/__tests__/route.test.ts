/** @jest-environment node */
import { GET } from '../route';
import { requireAuth } from '@/lib/auth-helpers';
import { getProfileSummary } from '@/server/utils/profile/getProfileSummary';
jest.mock('@/lib/auth-helpers', () => ({requireAuth: jest.fn()}));
jest.mock('@/server/utils/profile/getProfileSummary', () => ({getProfileSummary: jest.fn()}));
if (typeof Response.json !== 'function') Response.json = (data, init) => new Response(JSON.stringify(data), {...init, headers: {'Content-Type': 'application/json', ...init?.headers}});
beforeEach(() => {
  jest.resetAllMocks();
  (requireAuth as jest.Mock).mockResolvedValue({authenticated: true, userId: 'account-a'});
});
it('does not query private contributions for an anonymous visitor', async () => {
  (requireAuth as jest.Mock).mockResolvedValue({authenticated: false, response: new Response(null, {status: 401})});
  expect((await GET(new Request('https://test/profile'))).status).toBe(401);
  expect(getProfileSummary).not.toHaveBeenCalled();
});
it('rejects an account switch before reading or caching another account', async () => {
  expect((await GET(new Request('https://test/profile', {headers: {'X-Profile-Account': 'account-b'}}))).status).toBe(409);
  expect(getProfileSummary).not.toHaveBeenCalled();
});
it('returns only the session-owned summary without inventing demo activity', async () => {
  const summary = {approved: 0, pending: 0, artistsAdded: 0, selfEdits: 0, entries: [], suggestions: []};
  (getProfileSummary as jest.Mock).mockResolvedValue(summary);
  const result = await GET(new Request('https://test/profile?userId=account-b', {headers: {'X-Profile-Account': 'account-a'}}));
  expect(getProfileSummary).toHaveBeenCalledWith('account-a');
  expect(await result.json()).toEqual({...summary, userId: 'account-a'});
  expect(result.headers.get('Cache-Control')).toBe('private, no-store');
});
it('reports a database failure instead of displaying sample data', async () => {
  (getProfileSummary as jest.Mock).mockRejectedValue(new Error('Database unavailable'));
  expect((await GET(new Request('https://test/profile', {headers: {'X-Profile-Account': 'account-a'}}))).status).toBe(503);
});
