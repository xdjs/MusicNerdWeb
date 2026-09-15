import { outboundPlatform } from '@/lib/analytics/outboundPlatform';

describe('outboundPlatform', () => {
    it.each([
        ['https://open.spotify.com/artist/5RUy3e0zVDPXCvJCA3TUXi', 'spotify'],
        ['https://www.instagram.com/peacepeacegawd', 'instagram'],
        ['https://x.com/dutchmassive', 'x'],
        ['https://twitter.com/dutchmassive', 'x'],
        ['https://www.youtube.com/@dutchmassive', 'youtube'],
        ['https://youtu.be/abc', 'youtube'],
        ['https://dutchmassive.bandcamp.com/album/x', 'bandcamp'],
        ['https://www.deezer.com/artist/63751082', 'deezer'],
        ['https://soundcloud.com/x', 'soundcloud'],
        ['https://www.tiktok.com/@x', 'tiktok'],
        ['https://www.facebook.com/x', 'facebook'],
        ['https://www.inprocess.world/collect/base:0xabc/75', 'inprocess'],
        ['https://music.apple.com/us/artist/x/1', 'apple'],
        ['https://tidal.com/browse/artist/1', 'tidal'],
    ])('%s → %s', (href, platform) => {
        expect(outboundPlatform(href)).toBe(platform);
    });

    it('falls back to the bare hostname for anything else', () => {
        expect(outboundPlatform('https://www.pitchfork.com/reviews/x')).toBe('pitchfork.com');
        expect(outboundPlatform('https://kexp.org/x')).toBe('kexp.org');
    });

    it('returns null for a string that is not a URL', () => {
        expect(outboundPlatform('not a url')).toBeNull();
    });
});
