import { getShareCallToAction } from '../getShareCallToAction';
describe('getShareCallToAction', () => {
    test('personalizes short supported names without clipping', () => {
        expect(getShareCallToAction('Beyonce\u0301', 'know')).toBe('Get to know Beyoncé');
        expect(getShareCallToAction('Pete Rango', 'meet')).toBe('Meet Pete Rango');
        expect(getShareCallToAction('Pete Rango', 'music')).toBe('Explore their music');
    });
    test.each(['W'.repeat(17), '坂本龍一', '', 'Unknown Artist'])('uses honest generic copy for %s', name => {
        expect(getShareCallToAction(name, 'know')).toBe('Get to know the artist');
        expect(getShareCallToAction(name, 'meet')).toBe('Meet the artist');
    });
});
