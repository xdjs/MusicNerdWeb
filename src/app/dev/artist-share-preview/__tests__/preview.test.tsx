/** @jest-environment node */
jest.mock('next/navigation', () => ({ notFound: jest.fn(() => { throw new Error('404'); }) }));
jest.mock('@/server/utils/artistShare/renderArtistShareImage', () => ({ renderArtistShareImage: jest.fn(() => new Response('image')) }));
import ArtistSharePreviewPage from '../page';
import { GET } from '../image/route';
import { renderArtistShareImage } from '@/server/utils/artistShare/renderArtistShareImage';
describe('preview access boundary', () => {
    const old = process.env.VERCEL_ENV;
    afterEach(() => { if (old === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = old; });
    test('gallery and fixtures are absent from production', async () => {
        process.env.VERCEL_ENV = 'production';
        expect(() => ArtistSharePreviewPage()).toThrow('404');
        expect((await GET(new Request('https://example.com?case=normal'))).status).toBe(404);
    });
    test.each([['accent', 'Björk'], ['decomposed', 'Beyonce\u0301'], ['unicode', '坂本龍一']])('passes the %s example identity to the real renderer boundary', async (scenario, name) => {
        process.env.VERCEL_ENV = 'preview';
        expect((await GET(new Request(`https://example.com?case=${scenario}`))).status).toBe(200);
        expect(renderArtistShareImage).toHaveBeenLastCalledWith(name, null, null, 'white');
    });
    test('gallery and missing portrait fixture work in preview', async () => {
        process.env.VERCEL_ENV = 'preview';
        expect(ArtistSharePreviewPage()).toBeTruthy();
        expect((await GET(new Request('https://example.com?case=missing'))).status).toBe(200);
    });
});
