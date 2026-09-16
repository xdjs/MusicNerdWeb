import { readProfileJson } from '../readProfileJson';
beforeEach(() => { global.fetch = jest.fn(); });
it('asserts the rendered account and avoids the HTTP cache', async () => {
  (fetch as jest.Mock).mockResolvedValue({ok: true, json: async () => ({userId: 'a', approved: 3})});
  expect(await readProfileJson('/api/profile/summary', 'a')).toEqual({userId: 'a', approved: 3});
  expect(fetch).toHaveBeenCalledWith('/api/profile/summary', expect.objectContaining({cache: 'no-store', headers: {'X-Profile-Account': 'a'}}));
});
it('never stores another account response in the rendered account cache', async () => {
  (fetch as jest.Mock).mockResolvedValue({ok: true, json: async () => ({userId: 'b', approved: 3})});
  await expect(readProfileJson('/api/profile/summary', 'a')).rejects.toThrow('account changed');
});
it('surfaces failures instead of substituting fictional activity', async () => {
  (fetch as jest.Mock).mockResolvedValue({ok: false, status: 503});
  await expect(readProfileJson('/api/profile/summary', 'a')).rejects.toThrow('Could not load');
});
