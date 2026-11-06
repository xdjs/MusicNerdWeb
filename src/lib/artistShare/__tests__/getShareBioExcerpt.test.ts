import { getShareBioExcerpt } from '../getShareBioExcerpt';
describe('public bio excerpt', () => {
    test('missing prose stays missing', () => {
        expect(getShareBioExcerpt(null)).toBeNull();
        expect(getShareBioExcerpt('  ')).toBeNull();
    });
    test('preserves a complete short bio without an added ellipsis', () => {
        expect(getShareBioExcerpt('Björk makes music.')).toBe('Björk makes music.');
    });
    test('truncates at a word boundary with one true ellipsis', () => {
        const text = 'An artist making music with friends around the world.';
        expect(getShareBioExcerpt(text, 30)).toBe('An artist making music with…');
    });
    test('normalizes accents and presentation without paraphrasing', () => {
        expect(getShareBioExcerpt('**Beyonce\u0301** made *music* and [songs](https://example.com).')).toBe('Beyoncé made music and songs.');
    });
    test('unsupported excerpt is omitted rather than transliterated or downloaded', () => {
        expect(getShareBioExcerpt('坂本龍一 makes music.')).toBeNull();
    });
    test('bounds unbroken text', () => {
        expect(getShareBioExcerpt('W'.repeat(500))).toBe('W'.repeat(159) + '…');
    });
});
