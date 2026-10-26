import { readProfileJson } from '../readProfileJson';
import { requestUserApi } from '@/lib/user/requestUserApi';
jest.mock('@/lib/user/requestUserApi', () => ({ requestUserApi: jest.fn() }));
const request = requestUserApi as jest.Mock;
beforeEach(() => { request.mockReset(); });
it('asks the API for the rendered account', async () => {
  const signal = new AbortController().signal;
  request.mockResolvedValue({ok: true, json: async () => ({status: 'ok', userId: 'a', approved: 3})});
  expect(await readProfileJson('/api/profile/summary', 'a', signal)).toEqual({status: 'ok', userId: 'a', approved: 3});
  expect(request).toHaveBeenCalledWith('/api/profile/summary', {headers: {'X-Profile-Account': 'a'}, signal});
});
it('never stores another account response in the rendered account cache', async () => {
  request.mockResolvedValue({ok: true, json: async () => ({status: 'ok', userId: 'b', approved: 3})});
  await expect(readProfileJson('/api/profile/summary', 'a')).rejects.toThrow('account changed');
});
it('surfaces failures instead of substituting fictional activity', async () => {
  request.mockResolvedValue({ok: false, status: 503});
  await expect(readProfileJson('/api/profile/summary', 'a')).rejects.toThrow('Could not load');
});
