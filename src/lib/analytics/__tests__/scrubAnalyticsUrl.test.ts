import { scrubAnalyticsUrl } from '@/lib/analytics/scrubAnalyticsUrl';

const ORIGIN = 'https://www.musicnerd.xyz';

describe('scrubAnalyticsUrl', () => {
    it('returns a bare path unchanged', () => {
        expect(scrubAnalyticsUrl(`${ORIGIN}/leaderboard`)).toBe(`${ORIGIN}/leaderboard`);
    });

    it('removes user-input query parameters', () => {
        expect(scrubAnalyticsUrl(`${ORIGIN}/artist/6cb3d81a?search=abc`)).toBe(`${ORIGIN}/artist/6cb3d81a`);
        expect(scrubAnalyticsUrl(`${ORIGIN}/add-artist?name=x&spotify=y`)).toBe(`${ORIGIN}/add-artist`);
    });

    it('keeps only utm_* parameters, in their original order', () => {
        expect(scrubAnalyticsUrl(`${ORIGIN}/?utm_source=discord&foo=1&utm_campaign=2026-09-showcase`))
            .toBe(`${ORIGIN}/?utm_source=discord&utm_campaign=2026-09-showcase`);
        expect(scrubAnalyticsUrl(`${ORIGIN}/?utm_medium=bot&utm_content=card&utm_term=x&search=y`))
            .toBe(`${ORIGIN}/?utm_medium=bot&utm_content=card&utm_term=x`);
    });

    it('does not keep look-alike parameters', () => {
        expect(scrubAnalyticsUrl(`${ORIGIN}/?utm_sourcex=1&xutm_source=2&UTM_SOURCE=3`)).toBe(`${ORIGIN}/`);
    });

    it('drops the hash fragment', () => {
        expect(scrubAnalyticsUrl(`${ORIGIN}/artist/6cb3d81a#mn-latest`)).toBe(`${ORIGIN}/artist/6cb3d81a`);
    });

    it('drops admin traffic entirely', () => {
        expect(scrubAnalyticsUrl(`${ORIGIN}/admin`)).toBeNull();
        expect(scrubAnalyticsUrl(`${ORIGIN}/admin/agent-work?sections=audit`)).toBeNull();
    });

    it('does not treat a path that merely starts with the word admin as admin', () => {
        expect(scrubAnalyticsUrl(`${ORIGIN}/administrators`)).toBe(`${ORIGIN}/administrators`);
    });

    it('returns null for a string that is not a URL', () => {
        expect(scrubAnalyticsUrl('not a url')).toBeNull();
    });
});
