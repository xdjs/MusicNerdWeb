/** @jest-environment node */
let getSpotifyOEmbedImage: typeof import('../getSpotifyOEmbedImage').getSpotifyOEmbedImage;
const now = 1_800_000_000_000;
beforeEach(() => {
    jest.resetModules();
    getSpotifyOEmbedImage = require('../getSpotifyOEmbedImage').getSpotifyOEmbedImage;
    jest.spyOn(Date, 'now').mockReturnValue(now);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.mocked(fetch).mockReset();
});
afterEach(() => jest.restoreAllMocks());

const thumbnail = 'https://image-cdn-fa.spotifycdn.com/image/artist';
const response = (url = thumbnail) => ({ ok: true, json: async () => ({ thumbnail_url: url }) } as Response);

it('keeps the public endpoint, timeout, success cache and trusted thumbnail hosts', async () => {
    jest.mocked(fetch).mockResolvedValue(response());
    expect(await getSpotifyOEmbedImage('artist/id')).toBe(thumbnail);
    expect(fetch).toHaveBeenCalledWith(
        'https://open.spotify.com/oembed?url=https%3A%2F%2Fopen.spotify.com%2Fartist%2Fartist%252Fid',
        expect.objectContaining({ signal: expect.any(AbortSignal), next: { revalidate: 86400 } }),
    );
});
it('shares a single fallback request for concurrent lookups of the same artist', async () => {
    let resolve!: (response: Response) => void;
    jest.mocked(fetch).mockReturnValue(new Promise(res => { resolve = res; }));
    const lookups = Promise.all(Array.from({ length: 20 }, () => getSpotifyOEmbedImage('same')));
    resolve(response());
    expect(await lookups).toEqual(Array(20).fill(thumbnail));
    expect(fetch).toHaveBeenCalledTimes(1);
});
it('backs off failures for 30 seconds per artist and then recovers', async () => {
    jest.mocked(fetch).mockRejectedValue(new DOMException('timed out', 'TimeoutError'));
    for (let i = 0; i < 20; i++) expect(await getSpotifyOEmbedImage('failed')).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledTimes(1);
    jest.mocked(fetch).mockResolvedValue(response());
    expect(await getSpotifyOEmbedImage('different')).toBe(thumbnail);
    jest.mocked(Date.now).mockReturnValue(now + 30_000);
    expect(await getSpotifyOEmbedImage('failed')).toBe(thumbnail);
    expect(fetch).toHaveBeenCalledTimes(3);
});
it.each(['https://untrusted.example/image', 'http://i.scdn.co/image', 'https://evilspotifycdn.com/image'])(
    'rejects an unsafe thumbnail %s', async url => {
        jest.mocked(fetch).mockResolvedValue(response(url));
        expect(await getSpotifyOEmbedImage('unsafe')).toBeNull();
    },
);
it('briefly backs off unsuccessful HTTP responses without storing a durable empty image', async () => {
    jest.mocked(fetch).mockResolvedValue({ok:false,status:503} as Response);
    expect(await getSpotifyOEmbedImage('unavailable')).toBeNull();
    expect(await getSpotifyOEmbedImage('unavailable')).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
    jest.mocked(Date.now).mockReturnValue(now + 30_000);
    jest.mocked(fetch).mockResolvedValue(response('https://i.scdn.co/photo'));
    expect(await getSpotifyOEmbedImage('unavailable')).toBe('https://i.scdn.co/photo');
});
it('bounds the per-artist failure map instead of retaining every visited artist', async () => {
    jest.mocked(fetch).mockResolvedValue({ok:false,status:503} as Response);
    for (let i = 0; i <= 1000; i++) await getSpotifyOEmbedImage(String(i));
    await getSpotifyOEmbedImage('0');
    expect(fetch).toHaveBeenCalledTimes(1002);
});
