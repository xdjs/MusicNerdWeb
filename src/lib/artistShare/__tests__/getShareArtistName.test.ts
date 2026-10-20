import { getShareArtistName } from '../getShareArtistName';

describe('getShareArtistName', () => {
    test.each(['Björk', 'Beyoncé', 'LATASHÁ', 'Sigur Rós', 'Zoë Keating', 'João Gilberto', 'MØ', 'Ólafur Arnalds', 'Artist ©', 'Artist Œ'])('preserves supported glyphs in %s', name => {
        expect(getShareArtistName(name)).toBe(name);
    });
    test('normalizes decomposed accents without dropping them', () => {
        expect(getShareArtistName('  Beyonce\u0301  ')).toBe('Beyoncé');
    });
    test.each(['Dvořák', 'Łona', '坂本龍一', 'Кино', '🎵', 'Artist ©️', '\uffff'])('uses an explicit fallback for unsupported glyphs in %s', name => {
        expect(getShareArtistName(name)).toBe('Discover this artist');
    });
    test('retains existing whitespace and empty-name behavior', () => {
        expect(getShareArtistName('  Sigur\n Rós  ')).toBe('Sigur Rós');
        expect(getShareArtistName('   ')).toBe('Unknown Artist');
    });
});
