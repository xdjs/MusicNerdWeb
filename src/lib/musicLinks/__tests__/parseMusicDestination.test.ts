import { parseMusicDestination } from '../parseMusicDestination';

describe('parseMusicDestination', () => {
  it.each([
    ['https://music.apple.com/us/artist/pete-rango/1513734272', 'apple_music', 'artist', '1513734272'],
    ['https://itunes.apple.com/gb/artist/id31526769', 'apple_music', 'artist', '31526769'],
    ['https://music.apple.com/artist/31526769', 'apple_music', 'artist', '31526769'],
    ['https://www.beatport.com/artist/pete-rango/1041889', 'beatport', 'artist', '1041889'],
    ['https://www.beatport.com/artist/rob-adans/52133/tracks?page=4', 'beatport', 'artist', '52133'],
    ['https://www.beatport.com/artist/temi-vila/756748/releases', 'beatport', 'artist', '756748'],
    ['https://www.beatport.com/en/artist/pete-rango/1041889', 'beatport', 'artist', '1041889'],
    ['https://open.spotify.com/artist/3DmaZbBPnKSGnxYRpHobss', 'spotify', 'artist', '3DmaZbBPnKSGnxYRpHobss'],
    ['https://www.deezer.com/en/artist/5611', 'deezer', 'artist', '5611'],
    ['https://www.deezer.com/en-us/artist/5611', 'deezer', 'artist', '5611'],
    ['https://www.deezer.com/pt-br/album/123', 'deezer', 'release', '123'],
    ['https://www.deezer.com/es-mx/track/456', 'deezer', 'release', '456'],
    ['https://tidal.com/browse/artist/7773', 'tidal', 'artist', '7773'],
    ['https://open.qobuz.com/artist/123', 'qobuz', 'artist', '123'],
    ['https://www.qobuz.com/us-en/interpreter/willie-colon/123', 'qobuz', 'artist', '123'],
    ['https://music.amazon.com/artists/B0012345AB/willie-colon', 'amazon_music', 'artist', 'B0012345AB'],
    ['https://www.subvert.fm/pete-rango', 'subvert', 'artist', 'pete-rango'],
    ['https://subvert.fm/dutchyyy/releases/unfinished-hugs', 'subvert', 'release', 'dutchyyy/releases/unfinished-hugs'],
    ['https://subvert.fm/megadepth/the-embryology-of-human-institutions', 'subvert', 'release', 'megadepth/the-embryology-of-human-institutions'],
    ['https://www.subvert.fm/pete-rango/tracks/rush', 'subvert', 'release', 'pete-rango/tracks/rush'],
    ['https://release.supercollector.xyz/artist/joey-collins', 'supercollector', 'artist', 'joey-collins'],
    ['https://release.supercollector.xyz/yin-yang-joey-collins', 'supercollector', 'release', 'yin-yang-joey-collins'],
    ['https://soundcloud.com/dutchyyy', 'soundcloud', 'artist', 'dutchyyy'],
    ['https://soundcloud.com/lobster-theremin/lss004-nthng-unfinished', 'soundcloud', 'release', 'lobster-theremin/lss004-nthng-unfinished'],
    ['https://soundcloud.com/oglml/sets/unwanted-unloved-unfinished', 'soundcloud', 'release', 'oglml/sets/unwanted-unloved-unfinished'],
    ['https://audius.co/Dutchyyy', 'audius', 'artist', 'dutchyyy'],
    ['https://audius.co/Dutchyyy/trend-to-zero', 'audius', 'release', 'dutchyyy/trend-to-zero'],
    ['https://audius.co/Dutchyyy/album/traversal-cassette-version-released-via-thegrandgarden-45365', 'audius', 'release', 'dutchyyy/album/traversal-cassette-version-released-via-thegrandgarden-45365'],
    ['https://www.mixcloud.com/D-NY/', 'mixcloud', 'artist', 'd-ny'],
    ['https://www.mixcloud.com/D-NY/mix-name/', 'mixcloud', 'release', 'd-ny/mix-name'],
    ['https://peterango.bandcamp.com/music', 'bandcamp', 'artist', 'peterango'],
    ['https://music.apple.com/us/album/a-release/123?i=456', 'apple_music', 'release', '123'],
    ['https://www.beatport.com/track/a-track/123', 'beatport', 'release', '123'],
    ['https://www.deezer.com/album/123', 'deezer', 'release', '123'],
    ['https://open.spotify.com/album/3DmaZbBPnKSGnxYRpHobss', 'spotify', 'release', '3DmaZbBPnKSGnxYRpHobss'],
    ['https://listen.tidal.com/album/123', 'tidal', 'release', '123'],
    ['https://www.qobuz.com/us-en/album/album-name/abc123', 'qobuz', 'release', 'abc123'],
    ['https://music.amazon.co.uk/albums/B0012345AB', 'amazon_music', 'release', 'B0012345AB'],
    ['https://peterango.bandcamp.com/album/a-release', 'bandcamp', 'release', 'peterango/album/a-release'],
  ])('recognizes %s', (url, platform, kind, id) => {
    expect(parseMusicDestination(url)).toEqual(expect.objectContaining({ platform, kind, id, url }));
  });

  it.each([
    'javascript:alert(1)', 'ftp://music.apple.com/us/artist/123',
    'https://music.apple.com.evil.test/us/artist/123',
    'https://evil.test/music.apple.com/us/artist/123',
    'https://music.apple.com@evil.test/us/artist/123',
    'https://me:password@music.apple.com/us/artist/123',
    'https://music.apple.com:8080/us/artist/123',
    'https://music.apple.com/us/artist/not-an-id',
    'https://music.apple.com/us/artist/0',
    'https://music.apple.com/us/playlist/a-list/pl.123',
    'https://open.spotify.com/episode/abc', 'https://open.spotify.com/show/abc',
    'https://podcasts.apple.com/us/podcast/show/id123',
    'https://www.beatport.com/chart/a-chart/123',
    'https://www.beatport.com/label/a-label/123',
    'https://www.beatport.com/artist/slug/123/other',
    'https://www.beatportal.com/articles/123/artist-interview',
    'https://daily.bandcamp.com/features/a-great-interview',
    'https://bandcamp.com/tag/ambient', 'https://peterango.bandcamp.com/merch/a-shirt',
    'https://artist.bandcamp.com.evil.test/album/release',
    'https://www.discogs.com/release/123-some-record',
    'https://subvert.fm/discover', 'https://subvert.fm/blog/artist-story',
    'https://subvert.fm/changelog/', 'https://subvert.fm/terms-of-use/',
    'https://subvert.fm/privacy-policy/', 'https://subvert.fm/ai-policy/',
    'https://subvert.fm/author/subvert/',
    'https://soundcloud.com/terms-of-use', 'https://soundcloud.com/terms-of-use-purchases',
    'https://soundcloud.com/privacy-policy', 'https://soundcloud.com/cookies-policy',
    'https://audius.co/documents/TermsOfUse.pdf', 'https://audius.co/legal/privacy-policy',
    'https://mixcloud.com/premium/', 'https://mixcloud.com/pro/',
    'https://mixcloud.com/plans/', 'https://mixcloud.com/developers/',
    'https://mixcloud.com/select-terms/',
    'https://subvert.fm/@collector', 'https://subvert.fm/@collector/collection',
    'https://subvert.fm/pages/privacy-policy', 'https://subvert.fm/artist/settings',
    'https://subvert.fm/artist/tracks',
    'https://subvert.fm/artist/releases',
    'https://release.supercollector.xyz/artist', 'https://release.supercollector.xyz/about',
    'https://supercollector.xyz/', 'https://release.supercollector.xyz.evil.test/release',
    'https://soundcloud.com/search', 'https://soundcloud.com/dutchyyy/likes',
    'https://soundcloud.com/discover/sets', 'https://soundcloud.com/dutchyyy/sets',
    'https://audius.co/trending', 'https://audius.co/Dutchyyy/reposts',
    'https://audius.co/Dutchyyy/playlist/some-playlist',
    'https://mixcloud.com/discover/house', 'https://mixcloud.com/dj/favorites',
    'https://mixcloud.com/dj/playlists', 'https://youtube.com/watch?v=interview',
    'not a url',
  ])('does not classify %s as a music destination', url => {
    expect(parseMusicDestination(url)).toBeNull();
  });
});

it('does not apply a service route exclusion to an artist release slug', () => {
  expect(parseMusicDestination('https://subvert.fm/pete-rango/changelog')).toMatchObject({
    platform: 'subvert', kind: 'release', id: 'pete-rango/changelog',
  });
});


it.each(['artist', 'album', 'track'])('rejects malformed Spotify %s IDs', kind => {
  for (const id of ['abc', 'a'.repeat(21), 'a'.repeat(23), 'a'.repeat(21) + '_']) {
    expect(parseMusicDestination(`https://open.spotify.com/${kind}/${id}`)).toBeNull();
  }
});
it('preserves a valid case-sensitive Spotify ID through a localized URL', () => {
  expect(parseMusicDestination('https://open.spotify.com/intl-de/track/3DmaZbBPnKSGnxYRpHobss?si=tracking'))
    .toMatchObject({platform: 'spotify', kind: 'release', id: '3DmaZbBPnKSGnxYRpHobss'});
});
