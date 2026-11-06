import { removeUnresolvedCitations } from '../removeUnresolvedCitations';

const cited = new Set([2]);

it('removes a marker with no source together with the whitespace before it', () => {
    expect(removeUnresolvedCitations('Founded by Jorge Negron [1].', cited)).toBe('Founded by Jorge Negron.');
    expect(removeUnresolvedCitations('Members [Artist Doc] , then more [7]\n', cited)).toBe('Members , then more\n');
});

it('keeps markers with at least one source, and dates', () => {
    expect(removeUnresolvedCitations('Drums [2] and bass [2, 9] on [2026-05-13].', cited)).toBe('Drums [2] and bass [2, 9] on [2026-05-13].');
});
