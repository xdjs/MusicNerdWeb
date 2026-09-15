import { outboundClickEvent } from '@/lib/analytics/outboundClickEvent';

const ORIGIN = 'https://www.musicnerd.xyz';

describe('outboundClickEvent', () => {
    it('builds platform and surface for an off-site link inside a profile section', () => {
        expect(outboundClickEvent('https://open.spotify.com/artist/abc', 'mn-links', ORIGIN))
            .toEqual({ platform: 'spotify', surface: 'links' });
        expect(outboundClickEvent('https://www.inprocess.world/collect/base:0x1/2', 'mn-latest', ORIGIN))
            .toEqual({ platform: 'inprocess', surface: 'latest' });
    });

    it('reports "page" when the link is not inside a profile section', () => {
        expect(outboundClickEvent('https://dutchmassive.bandcamp.com', null, ORIGIN))
            .toEqual({ platform: 'bandcamp', surface: 'page' });
    });

    it('ignores links to the site itself', () => {
        expect(outboundClickEvent(`${ORIGIN}/artist/abc`, 'mn-links', ORIGIN)).toBeNull();
        expect(outboundClickEvent('/leaderboard', 'mn-links', ORIGIN)).toBeNull();
    });

    it('ignores non-http schemes and unparseable hrefs', () => {
        expect(outboundClickEvent('mailto:x@y.z', 'mn-links', ORIGIN)).toBeNull();
        expect(outboundClickEvent('javascript:void(0)', null, ORIGIN)).toBeNull();
        expect(outboundClickEvent('', null, ORIGIN)).toBeNull();
    });
});
