import { getDisplayedCatalogId } from '../getDisplayedCatalogId';

const spotify = '0y9DJxRh3j84i13hctQcFx';
it('takes the exact artist ID from the displayed catalog URL', () => {
  expect(getDisplayedCatalogId('spotify', `https://open.spotify.com/intl-en/artist/${spotify}?si=old`)).toBe(spotify);
  expect(getDisplayedCatalogId('deezer', 'https://www.deezer.com/en/artist/87797542')).toBe('87797542');
});
it.each([
  ['spotify', `https://open.spotify.com/album/${spotify}`],
  ['deezer', 'https://www.deezer.com/track/87797542'],
  ['deezer', 'https://evil.test/artist/87797542'],
  ['spotify', 'https://www.deezer.com/artist/87797542'],
  ['deezer', 'https://user:password@www.deezer.com/artist/87797542'],
  ['deezer', 'not a URL'],
])('refuses an ambiguous displayed %s identity instead of clearing a newer value', (site, href) => {
  expect(() => getDisplayedCatalogId(site, href)).toThrow('Reload');
});
it('omits the catalog CAS field for other platforms', () => {
  expect(getDisplayedCatalogId('instagram', 'https://instagram.com/example')).toBeUndefined();
});
