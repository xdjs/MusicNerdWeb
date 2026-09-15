import { outboundClickEvent } from '@/lib/analytics/outboundClickEvent';

const ORIGIN = 'https://www.musicnerd.xyz';

describe('outboundClickEvent', () => {
    it('builds platform and passes the surface through for an off-site link', () => {
        expect(outboundClickEvent('https://open.spotify.com/artist/abc', 'links', ORIGIN))
            .toEqual({ platform: 'spotify', surface: 'links' });
        expect(outboundClickEvent('https://www.inprocess.world/collect/base:0x1/2', 'latest', ORIGIN))
            .toEqual({ platform: 'inprocess', surface: 'latest' });
        expect(outboundClickEvent('https://dutchmassive.bandcamp.com', 'page', ORIGIN))
            .toEqual({ platform: 'bandcamp', surface: 'page' });
    });

    it('ignores links to the site itself', () => {
        expect(outboundClickEvent(`${ORIGIN}/artist/abc`, 'links', ORIGIN)).toBeNull();
        expect(outboundClickEvent('/leaderboard', 'links', ORIGIN)).toBeNull();
    });

    it('ignores non-http schemes and unparseable hrefs', () => {
        expect(outboundClickEvent('mailto:x@y.z', 'links', ORIGIN)).toBeNull();
        expect(outboundClickEvent('javascript:void(0)', 'page', ORIGIN)).toBeNull();
        expect(outboundClickEvent('', 'page', ORIGIN)).toBeNull();
    });
});
