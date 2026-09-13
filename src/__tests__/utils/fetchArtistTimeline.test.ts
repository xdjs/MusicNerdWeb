import { jest } from '@jest/globals';

// unstable_cache needs a request context; the fetcher is exercised directly here
// (cachedOrDirect's fallback path has its own test in server/lib/__tests__).
jest.mock('next/cache', () => ({ unstable_cache: jest.fn((fn) => fn) }));

const ARTIST = '0x1f8dadb40c2cdb0d6d281add31c76e14f8ba6a91';
const ARTIST_URL = `https://www.inprocess.world/${ARTIST}`;

function moment(id: string, extra: Record<string, unknown> = {}) {
    return {
        id, address: '0xbfaab156f4d1d7b4f5a3b1f0f5b7a2c3d4e5f607', token_id: id, chain_id: 8453,
        created_at: '2026-09-09T13:08:00+00:00', hidden: [],
        metadata: { name: `Moment ${id}`, image: `ar://${id}`, content: { mime: 'audio/mpeg' } },
        ...extra,
    };
}

function jsonResponse(body: unknown, status = 200): Response {
    return { ok: status >= 200 && status < 300, status, json: async () => body, text: async () => JSON.stringify(body) } as unknown as Response;
}

describe('fetchArtistTimeline', () => {
    const originalFetch = global.fetch;
    let fetchMock: jest.Mock<typeof fetch>;
    let errorSpy: jest.SpiedFunction<typeof console.error>;

    beforeEach(() => {
        fetchMock = jest.fn<typeof fetch>();
        global.fetch = fetchMock as unknown as typeof fetch;
        errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });
    afterEach(() => {
        global.fetch = originalFetch;
        errorSpy.mockRestore();
    });

    async function load() {
        return (await import('@/server/utils/inprocess/fetchArtistTimeline')).fetchArtistTimeline;
    }

    it('calls the public timeline for the stored address and normalizes moments', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ status: 'success', moments: [moment('1'), moment('2', { hidden: [ARTIST] }), { id: 'bad' }] }));
        const moments = await (await load())(ARTIST);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toBe(`https://api.inprocess.world/api/timeline?artist=${ARTIST}&limit=12`);
        expect(init.signal).toBeInstanceOf(AbortSignal);
        expect(moments).toEqual([{
            id: '1', title: 'Moment 1', kind: 'audio', imageUrl: 'https://arweave.net/1',
            createdAt: '2026-09-09T13:08:00+00:00',
            url: 'https://www.inprocess.world/collect/base:0xbfaab156f4d1d7b4f5a3b1f0f5b7a2c3d4e5f607/1',
        }]);
        expect(errorSpy).not.toHaveBeenCalled();
    });

    it('accepts a full profile URL too', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ status: 'success', moments: [moment('1')] }));
        expect(await (await load())(ARTIST_URL)).toHaveLength(1);
        expect((fetchMock.mock.calls[0] as [string])[0]).toContain(`artist=${ARTIST}`);
    });

    it('returns [] without a request when the stored value is not an In Process link', async () => {
        const fetchArtistTimeline = await load();
        expect(await fetchArtistTimeline('https://www.inprocess.world/0xbogus')).toEqual([]);
        expect(await fetchArtistTimeline('0xbogus')).toEqual([]);
        expect(await fetchArtistTimeline(null)).toEqual([]);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('returns [] and logs on an HTTP error', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ error: 'nope' }, 500));
        expect(await (await load())(ARTIST_URL)).toEqual([]);
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('HTTP 500'));
    });

    it('returns [] and logs when the network call throws', async () => {
        fetchMock.mockRejectedValue(new Error('boom'));
        expect(await (await load())(ARTIST_URL)).toEqual([]);
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('request failed'), 'boom');
    });

    it('returns [] and logs on an unexpected body', async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse({ status: 'success', moments: 'nope' }));
        expect(await (await load())(ARTIST_URL)).toEqual([]);
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('no moments array'));

        fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => { throw new Error('bad json'); }, text: async () => '' } as unknown as Response);
        expect(await (await load())(ARTIST_URL)).toEqual([]);
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('unparseable JSON'), expect.any(Error));
    });

    it('skips null and non-object entries instead of throwing', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ status: 'success', moments: [null, 'x', 7, moment('1')] }));
        expect(await (await load())(ARTIST)).toHaveLength(1);
        expect(errorSpy).not.toHaveBeenCalled();
    });

    it('keeps the deadline armed while the body is read', async () => {
        jest.useFakeTimers();
        try {
            let signal: AbortSignal | undefined;
            fetchMock.mockImplementation(async (_url, init) => {
                signal = (init as RequestInit).signal as AbortSignal;
                return { ok: true, status: 200, text: async () => '', json: () => new Promise((_resolve, reject) => {
                    signal!.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
                }) } as unknown as Response;
            });
            const pending = (await load())(ARTIST);
            await Promise.resolve();
            expect(signal?.aborted).toBe(false);
            jest.advanceTimersByTime(10_001);
            expect(signal?.aborted).toBe(true);
            expect(await pending).toEqual([]);
            expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('unparseable JSON'), expect.anything());
        } finally {
            jest.useRealTimers();
        }
    });

    it('returns [] and logs when the cache layer throws', async () => {
        jest.resetModules();
        jest.doMock('next/cache', () => ({ unstable_cache: jest.fn(() => async () => { throw new Error('cache down'); }) }));
        expect(await (await load())(ARTIST)).toEqual([]);
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('cache failed'), 'cache down');
        jest.dontMock('next/cache');
        jest.resetModules();
    });

    it('returns [] for an empty timeline without logging', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ status: 'success', moments: [] }));
        expect(await (await load())(ARTIST_URL)).toEqual([]);
        expect(errorSpy).not.toHaveBeenCalled();
    });
});
