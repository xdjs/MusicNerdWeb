import type { UIMessage } from 'ai';
import { getChatSources } from '../getChatSources';

const source = (n: number) => ({ type: 'source-url', sourceId: String(n), url: `https://example.com/${n}`, title: `Source ${n}` });
const message = (text: string, parts: unknown[]): UIMessage => ({ id: 'm1', role: 'assistant', parts: [...parts, { type: 'text', text }] } as UIMessage);

it('returns the sources the answer cites, by number', () => {
    expect(getChatSources(message('Drums [2] and bass [1, 2].', [source(1), source(2), source(3)]))).toEqual([
        { n: 1, title: 'Source 1', url: 'https://example.com/1' },
        { n: 2, title: 'Source 2', url: 'https://example.com/2' },
    ]);
});

it('ignores dates and labels in brackets and numbers with no source', () => {
    expect(getChatSources(message('On [2026-05-13] [Artist Doc] [7].', [source(1)]))).toEqual([]);
});

it('ignores a source part whose id is not a citation number', () => {
    expect(getChatSources(message('See [1].', [{ ...source(1), sourceId: 'abc' }]))).toEqual([]);
});

const doc = (n: number, url: string, title = `Doc ${n}`) => ({ type: 'source-url', sourceId: String(n), url, title });
it('resolves section and paragraph citations, and not the digits inside a heading', () => {
    const sources = getChatSources(message('Toured [1, §Live, 1999] and wrote [2, ¶3].',
        [doc(1, 'https://x.example/a.pdf'), doc(2, 'https://x.example/b'), doc(1999, 'https://x.example/c')]));
    expect(sources.map(s => s.n)).toEqual([1, 2]);
});

it('gives a document with no public URL no URL', () => {
    expect(getChatSources(message('Founded 2012 [4, p.2].', [doc(4, 'musicnerd://vault/0b6c1f9e-4d7a-4c1e-9a43-2f5a8f1e7b20', 'timeline.pdf')])))
        .toEqual([{ n: 4, title: 'timeline.pdf', url: null }]);
});
