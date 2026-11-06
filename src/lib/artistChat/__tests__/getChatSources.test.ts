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
