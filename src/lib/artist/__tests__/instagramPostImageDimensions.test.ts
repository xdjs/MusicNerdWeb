import { instagramPostImageDimensions } from '../instagramPostImageDimensions';

const url = 'https://cdn.example.com/post.webp';
const raw = { displayUrl: url, _musicnerdThumbnail: { url, width: 640, height: 427 } };

it.each([[640, 427], [361, 640], [640, 640]])('returns only the matching retained dimensions %i × %i', (width, height) => {
    expect(instagramPostImageDimensions({ ...raw, _musicnerdThumbnail: { ...raw._musicnerdThumbnail, width, height, secret: 'private' } })).toEqual({ width, height });
});

it.each([null, {}, { ...raw, displayUrl: 'https://cdn.example.com/replaced.webp' },
    { ...raw, _musicnerdThumbnail: null }])('does not guess dimensions for missing or unrelated metadata', value => {
    expect(instagramPostImageDimensions(value)).toBeUndefined();
});

it.each([0, -1, 640.5, '640', Infinity, NaN, 641])('rejects invalid retained width/height %s', value => {
    expect(instagramPostImageDimensions({ ...raw, _musicnerdThumbnail: { ...raw._musicnerdThumbnail, width: value } })).toBeUndefined();
    expect(instagramPostImageDimensions({ ...raw, _musicnerdThumbnail: { ...raw._musicnerdThumbnail, height: value } })).toBeUndefined();
});
