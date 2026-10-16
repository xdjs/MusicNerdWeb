import { deduplicateAnswerOriginals } from '../deduplicateAnswerOriginals';
const original = { n: 1, sourceId: 'source', revision: 'revision', url: 'https://artist.example/interview', text: 'The full original and its qualification.', start: 0, end: 40, evidenceKind: 'original_text', curation: 'approved', publishedAt: null };
it('retains the original citation numbers and every character without mutating input', () => {
 const third = { ...original, n: 3, sourceId: 'other' };
 const values = [original, { ...original, n: 2 }, third];
 expect(deduplicateAnswerOriginals(values)).toEqual([original, third]);
 expect(values).toHaveLength(3);
});
it.each([
 { sourceId: 'other' }, { revision: 'changed' }, { url: 'https://elsewhere.example/interview' },
 { text: 'A different window.' }, { start: 4, end: 44 }, { evidenceKind: 'caption' },
 { curation: 'pending' }, { publishedAt: '2026-10-15' },
])('keeps originals with different source coordinates or metadata: %s', change => {
 const second = { ...original, ...change, n: 2 };
 expect(deduplicateAnswerOriginals([original, second])).toEqual([original, second]);
});
