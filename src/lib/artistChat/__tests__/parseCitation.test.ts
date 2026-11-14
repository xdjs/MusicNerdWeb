import { CITATION_PATTERN, parseCitation } from '../parseCitation';

const bodies = (text: string) => [...text.matchAll(new RegExp(CITATION_PATTERN, 'g'))].map(m => m[1]);

it('reads plain numbers and keeps the numbers of a mixed group', () => {
    expect(parseCitation('4')).toEqual({ numbers: [4], labels: [] });
    expect(parseCitation('11, 18, Artist Doc')).toEqual({ numbers: [11, 18], labels: [] });
    expect(parseCitation('Artist Doc')).toEqual({ numbers: [], labels: [] });
});

it('reads a date as no citation at all', () => {
    expect(parseCitation('2026-05-13')).toBeNull();
});

it('reads a page, section or paragraph locator as a label for its first number only', () => {
    expect(parseCitation('1, p.8')).toEqual({ numbers: [1], labels: ['p.8'] });
    expect(parseCitation('2, ¶3')).toEqual({ numbers: [2], labels: ['¶3'] });
    expect(parseCitation('3, §Early Life')).toEqual({ numbers: [3], labels: ['§Early Life'] });
    // A heading keeps its commas, digits and punctuation, and none of it is cited.
    expect(parseCitation('1, §Live, 1999')).toEqual({ numbers: [1], labels: ['§Live, 1999'] });
    expect(parseCitation('4, §Tours: 2012–2019 (Europe, U.S.)')).toEqual({ numbers: [4], labels: ['§Tours: 2012–2019 (Europe, U.S.)'] });
    expect(parseCitation('1, §2026-05 Tour')).toEqual({ numbers: [1], labels: ['§2026-05 Tour'] });
});

it('keeps legacy page labels beside every number and drops invented labels', () => {
    expect(parseCitation('3, pp.10, Artist Doc')).toEqual({ numbers: [3], labels: ['pp.10'] });
    expect(parseCitation('1, 2, page 3')).toEqual({ numbers: [1, 2], labels: ['page 3'] });
});

it('finds markers, including a section heading longer than an ordinary marker', () => {
    const heading = '§Discography and collaborations, 2012 to the present day, by year';
    expect(bodies(`A [1] b [2, ${heading}] c [2026-05-13] [Artist Doc].`))
        .toEqual(['1', `2, ${heading}`, '2026-05-13', 'Artist Doc']);
    expect(bodies(`[${'x'.repeat(80)}]`)).toEqual([]);
});

it('counts only plain citation numbers, as the API does', () => {
    for (const body of ['007', '3.0', '+2', '0x3', '1e1', '1999', '0'])
        expect(parseCitation(body)).toEqual({ numbers: [], labels: [] });
    expect(parseCitation('3.0, 4')).toEqual({ numbers: [4], labels: [] });
    expect(parseCitation('2, 3.0, p.4')).toEqual({ numbers: [2], labels: ['p.4'] });
});

it('scans a long run of unclosed section markers in linear time', () => {
    const text = '[1,§'.repeat(20_000);
    const started = performance.now();
    expect(bodies(text)).toEqual([]);
    expect(performance.now() - started).toBeLessThan(350);
});

it('reads a heading of up to 300 characters', () => {
    const heading = `§${'h'.repeat(299)}`;
    expect(bodies(`[1, ${heading}]`)).toEqual([`1, ${heading}`]);
});
