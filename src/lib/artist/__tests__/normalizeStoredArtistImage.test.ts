import { normalizeStoredArtistImage } from '../normalizeStoredArtistImage';
it.each([null,undefined,'','http://example.com/p.png','//example.com/p.png','/\\example.com/p.png','https://user:password@example.com/p.png','broken','/default_pfp_pink.png'])('rejects unsafe or placeholder stored image %s',value=>expect(normalizeStoredArtistImage(value)).toBeNull());
it.each(['/images/photo.png','https://example.com/photo.png'])('preserves usable portraits %s',value=>expect(normalizeStoredArtistImage(` ${value} `)).toBe(value));
