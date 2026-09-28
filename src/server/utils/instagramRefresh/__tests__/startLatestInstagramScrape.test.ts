/** @jest-environment node */
jest.mock('@/env', () => ({ APIFY_API_TOKEN: 'test-token' }));
import { startLatestInstagramScrape } from '../startLatestInstagramScrape';
const mockFetch = jest.fn();
beforeEach(() => { global.fetch = mockFetch; mockFetch.mockReset(); });
it('sends both recent-post and hard billing limits without automatic paid restarts', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ data: { id: 'run1' } }) });
    expect(await startLatestInstagramScrape('dutchyyy', '2026-09-27T00:00:00.000Z')).toBe('run1');
    const [url, request] = mockFetch.mock.calls[0]!;
    const params = new URL(url).searchParams;
    expect(params.get('maxTotalChargeUsd')).toBe('0.03');
    expect(params.get('maxItems')).toBe('9');
    expect(params.get('timeout')).toBe('180');
    expect(params.get('restartOnError')).toBe('false');
    expect(JSON.parse(request.body)).toEqual({ directUrls: ['https://www.instagram.com/dutchyyy/'],
        resultsType: 'posts', resultsLimit: 9, onlyPostsNewerThan: '2026-09-27T00:00:00.000Z', addParentData: false });
});
it('does not retry an ambiguous network failure', async () => {
    mockFetch.mockRejectedValue(new Error('timeout'));
    expect(await startLatestInstagramScrape('dutchyyy', '2026-09-27T00:00:00.000Z')).toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(1);
});
