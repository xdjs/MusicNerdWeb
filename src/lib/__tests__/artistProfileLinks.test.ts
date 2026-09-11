import { getListeningLinks, getProfileLinks, orderProfileLinks } from '../artistProfileLinks';
import type { ArtistLink } from '@/server/utils/queries/artistQueries';
const artist = { spotify: 'sp1', deezer: 'dz1' };
function link(siteName: string, extra: Partial<ArtistLink> = {}): ArtistLink {
    return { siteName, artistUrl: `https://${siteName}.com/artist`, isMonetized: false, platformTypeList: ['social'], ...extra } as ArtistLink;
}

test('Listen includes stored music and support services and excludes social profiles', () => {
    const result = getListeningLinks(artist, [link('instagram'), link('soundcloud'), link('bandcamp'), link('subvert'), link('inprocess', { platformTypeList: ['listen'] })]);
    expect(result.map(item => item.siteName)).toEqual(['spotify', 'deezer', 'soundcloud', 'bandcamp', 'subvert', 'inprocess']);
    expect(result.find(item => item.siteName === 'deezer')?.iconSrc).toBe('/siteIcons/deezer_icon.svg');
});
test('Apple Music needs a saved approved website artist URL, not an album or lookalike host', () => {
    const sources = [
        { type: 'website', url: 'https://music.apple.com.evil.test/us/artist/fake/1' },
        { type: 'website', url: 'https://music.apple.com/us/album/record/1' },
        { type: 'interview', url: 'https://music.apple.com/us/artist/wrong/2' },
        { type: 'website', url: 'https://music.apple.com/us/artist/nova/123' },
    ];
    expect(getListeningLinks({ spotify: null, deezer: null }, [], sources)).toEqual([expect.objectContaining({ label: 'Apple Music', href: sources[3].url })]);
});
test('missing and unsafe destinations are omitted', () => {
    expect(getListeningLinks({ spotify: '', deezer: null }, [link('soundcloud', { artistUrl: 'javascript:alert(1)' })])).toEqual([]);
});
test('saved order is stable when links are removed or added and respects support grouping', () => {
    const links = getProfileLinks(artist, [link('instagram'), link('bandcamp')], 'links');
    expect(orderProfileLinks(links, ['instagram', 'removed', 'deezer']).map(item => item.siteName)).toEqual(['instagram', 'deezer', 'spotify']);
    expect(getProfileLinks(artist, [link('bandcamp')], 'support').map(item => item.siteName)).toEqual(['bandcamp']);
});
