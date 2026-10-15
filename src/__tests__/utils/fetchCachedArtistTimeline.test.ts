/** @jest-environment node */
jest.mock('@/server/lib/cachedOrDirect', () => ({ cachedOrDirect: jest.fn(fn => fn) }));
jest.mock('@/server/utils/fetchTimelineDirect', () => ({ fetchTimelineDirect: jest.fn() }));
import { fetchCachedArtistTimeline } from '@/server/utils/fetchCachedArtistTimeline';
import { fetchTimelineDirect } from '@/server/utils/fetchTimelineDirect';
import { cachedOrDirect } from '@/server/lib/cachedOrDirect';
const address = '0x' + 'a'.repeat(40);
beforeEach(() => jest.clearAllMocks());
it('uses the existing bounded cache and retains a confirmed empty result', async () => {
  jest.mocked(fetchTimelineDirect).mockResolvedValue([]);
  await expect(fetchCachedArtistTimeline(address)).resolves.toEqual([]);
  expect(cachedOrDirect).toHaveBeenCalledWith(fetchTimelineDirect, ['inprocess-artist-timeline-v2'], { revalidate: 600, tags: [`latest:inprocess:${address}`] });
});
it('propagates failures so display recovery cannot claim the source was checked', async () => {
  jest.mocked(fetchTimelineDirect).mockRejectedValue(new Error('Unavailable'));
  await expect(fetchCachedArtistTimeline(address)).rejects.toThrow('Unavailable');
});
it('rejects invalid connections before contacting or caching a provider', async () => {
  await expect(fetchCachedArtistTimeline('https://unrelated.example')).rejects.toThrow('Invalid');
  expect(fetchTimelineDirect).not.toHaveBeenCalled();
  expect(cachedOrDirect).not.toHaveBeenCalled();
});
