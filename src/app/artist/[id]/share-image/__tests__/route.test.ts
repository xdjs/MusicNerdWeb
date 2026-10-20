jest.mock('@/server/utils/artistShare/getSharePublicBio', () => ({ getSharePublicBio: jest.fn().mockResolvedValue(null) }));
import { getSharePublicBio } from '@/server/utils/artistShare/getSharePublicBio';
/** @jest-environment node */
jest.mock('@/server/utils/queries/artistQueries', () => ({ getArtistById: jest.fn() }));
jest.mock('@/server/utils/musicPlatform', () => ({ musicPlatformData: { getArtistPortrait: jest.fn() } }));
jest.mock('@/server/utils/artistShare/loadSharePortrait', () => ({ loadSharePortrait: jest.fn() }));
jest.mock('@/server/utils/artistShare/renderArtistShareImage', () => ({ renderArtistShareImage: jest.fn(() => new Response('png')) }));
import { GET } from '../route';
import { getArtistById } from '@/server/utils/queries/artistQueries';
import { musicPlatformData } from '@/server/utils/musicPlatform';
import { renderArtistShareImage } from '@/server/utils/artistShare/renderArtistShareImage';
import { loadSharePortrait } from '@/server/utils/artistShare/loadSharePortrait';
const id = '00000000-0000-0000-0000-000000000001';
const run = (value = id) => GET(new Request('https://example.com'), { params: Promise.resolve({ id: value }) });
describe('artist share image', () => {
    beforeEach(() => { jest.clearAllMocks(); (getSharePublicBio as jest.Mock).mockResolvedValue(null); });
    test('invalid ids do not reach the database', async () => {
        expect((await run('bad')).status).toBe(404);
        expect(getArtistById).not.toHaveBeenCalled();
    });
    test('unknown artist is uncached 404', async () => {
        (getArtistById as jest.Mock).mockResolvedValue(null);
        expect((await run()).status).toBe(404);
    });
    test('database failure is uncached 503', async () => {
        (getArtistById as jest.Mock).mockRejectedValue(new Error('private database detail'));
        const res = await run();
        expect(res.status).toBe(503);
        expect(res.headers.get('cache-control')).toBe('no-store');
        expect(await res.text()).not.toContain('private');
    });
    test('passes only public name and normalized image to the renderer', async () => {
        (getArtistById as jest.Mock).mockResolvedValue({ id, name: 'Dutchyyy', bio: 'PRIVATE', addedBy: 'PRIVATE' });
        (musicPlatformData.getArtistPortrait as jest.Mock).mockResolvedValue('https://i.scdn.co/image/abc');
        (loadSharePortrait as jest.Mock).mockResolvedValue('data:image/png;base64,abc');
        expect((await run()).status).toBe(200);
        expect(renderArtistShareImage).toHaveBeenCalledWith('Dutchyyy', 'data:image/png;base64,abc', null, 'white');
    });
    test.each([['pink', 'pink'], ['logo', 'logo'], ['unexpected', 'white']])('bounds the palette query %s to %s', async (query, palette) => {
        (getArtistById as jest.Mock).mockResolvedValue({ id, name: 'Artist' });
        (musicPlatformData.getArtistPortrait as jest.Mock).mockResolvedValue(null);
        (loadSharePortrait as jest.Mock).mockResolvedValue(null);
        const response = await GET(new Request(`https://example.com?palette=${query}`), { params: Promise.resolve({ id }) });
        expect(response.status).toBe(200);
        expect(renderArtistShareImage).toHaveBeenLastCalledWith('Artist', null, null, palette);
    });
    test('bio lookup failure omits text and disables caching', async () => {
        (getArtistById as jest.Mock).mockResolvedValue({ id, name: 'Artist', bio: 'PRIVATE' });
        (getSharePublicBio as jest.Mock).mockRejectedValue(new Error('gate unavailable'));
        (musicPlatformData.getArtistPortrait as jest.Mock).mockResolvedValue(null);
        (loadSharePortrait as jest.Mock).mockResolvedValue(null);
        const response = await run();
        expect(response.status).toBe(200);
        expect(response.headers.get('cache-control')).toBe('no-store');
        expect(renderArtistShareImage).toHaveBeenCalledWith('Artist', null, null, 'white');
    });
    test('retries render failure with a network-independent card', async () => {
        (getArtistById as jest.Mock).mockResolvedValue({ id, name: 'Example' });
        (musicPlatformData.getArtistPortrait as jest.Mock).mockResolvedValue(null);
        (loadSharePortrait as jest.Mock).mockResolvedValue(null);
        (renderArtistShareImage as jest.Mock).mockImplementationOnce(() => ({ arrayBuffer: () => Promise.reject(new Error('render')) }));
        expect((await run()).status).toBe(200);
        expect(renderArtistShareImage).toHaveBeenLastCalledWith('Discover this artist', null, null, 'white');
    });
    test('failed portrait still produces named fallback', async () => {
        (getArtistById as jest.Mock).mockResolvedValue({ id, name: 'Dutchyyy' });
        (musicPlatformData.getArtistPortrait as jest.Mock).mockRejectedValue(new Error('provider'));
        (loadSharePortrait as jest.Mock).mockResolvedValue(null);
        expect((await run()).status).toBe(200);
        expect(renderArtistShareImage).toHaveBeenCalledWith('Dutchyyy', null, null, 'white');
    });
});
