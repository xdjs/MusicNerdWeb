import { eligibleSharePortrait } from '../eligibleSharePortrait';
const storage = 'https://example.supabase.co';
describe('eligibleSharePortrait', () => {
    test.each(['https://image-cdn-fa.spotifycdn.com/image/abc', 'https://image-cdn-ak.spotifycdn.com/image/abc', 'https://i.scdn.co/image/abc', 'https://cdn-images.dzcdn.net/images/artist/abc/1000x1000.jpg', '/artist-images/example.jpg'])( 'accepts public portrait %s', value => {
        expect(eligibleSharePortrait(value, 'artist', storage)).toBeTruthy();
    });
    test('accepts only this artist public profile upload', () => {
        expect(eligibleSharePortrait(`${storage}/storage/v1/object/public/vault-files/profile-images/artist_123.png`, 'artist', storage)).toBeTruthy();
        expect(eligibleSharePortrait(`${storage}/storage/v1/object/public/vault-files/profile-images/other_123.png`, 'artist', storage)).toBeNull();
    });
    test.each(['http://i.scdn.co/image/abc', 'https://i.scdn.co.evil.com/image/a', 'https://u:p@i.scdn.co/image/a', 'https://i.scdn.co/image/a?token=secret', 'https://localhost/x', 'https://cdn-images.dzcdn.net/images/cover/a.jpg', '/artist-images/../secret', '//evil.com/a', null])('rejects %s', value => {
        expect(eligibleSharePortrait(value, 'artist', storage)).toBeNull();
    });
});
