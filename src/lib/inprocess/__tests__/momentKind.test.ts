import { momentKind } from '@/lib/inprocess/momentKind';

describe('momentKind', () => {
    it.each([
        ['video/mp4', 'video'],
        ['video/quicktime', 'video'],
        ['audio/mpeg', 'audio'],
        ['image/png', 'image'],
        ['IMAGE/JPEG', 'image'],
        ['application/pdf', 'writing'],
        ['text/plain', 'writing'],
        ['application/zip', 'other'],
        [null, 'other'],
        [undefined, 'other'],
    ])('%p → %p', (mime, expected) => {
        expect(momentKind(mime)).toBe(expected);
    });
});
