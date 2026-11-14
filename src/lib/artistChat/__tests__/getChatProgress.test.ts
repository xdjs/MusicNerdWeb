import type { UIMessage } from 'ai';
import { getChatProgress } from '../getChatProgress';

const assistant = (parts: unknown[]): UIMessage => ({ id: 'm1', role: 'assistant', parts } as UIMessage);
const search = {
    type: 'tool-searchSources', toolCallId: 't1', state: 'output-available', input: { query: 'drums' },
    output: { sources: [{ sourceId: 'vault:9', title: 'Interview on Pitchfork', url: 'https://pitchfork.com/a', snippet: '…' }] },
};

it('says Lore is being checked before the first tool step arrives', () => {
    expect(getChatProgress(undefined)).toBe('Checking Lore…');
    expect(getChatProgress(assistant([{ type: 'step-start' }]))).toBe('Checking Lore…');
});

it('names the latest tool step', () => {
    expect(getChatProgress(assistant([{ ...search, state: 'input-available', output: undefined }]))).toBe('Searching saved sources…');
    expect(getChatProgress(assistant([search, { type: 'tool-webSearch', toolCallId: 't2', state: 'input-available', input: { query: 'x' } }])))
        .toBe('Searching the web…');
});

it('names the source being read, from its output or from the search that found it', () => {
    expect(getChatProgress(assistant([search, { type: 'tool-readSource', toolCallId: 't2', state: 'input-available', input: { sourceId: 'vault:9' } }])))
        .toBe('Reading Interview on Pitchfork…');
    expect(getChatProgress(assistant([{ type: 'tool-readSource', toolCallId: 't2', state: 'output-available', input: { sourceId: 'x' },
        output: { n: 1, title: 'Bandcamp bio', url: 'https://a.bandcamp.com', text: '…' } }])))
        .toBe('Reading Bandcamp bio…');
    expect(getChatProgress(assistant([{ type: 'tool-readSource', toolCallId: 't2', state: 'input-available', input: { sourceId: 'unknown' } }])))
        .toBe('Reading a saved source…');
});

it('names the PDF being searched for or read, from its output, the discovery that found it, or the filename asked for', () => {
    const discover = {
        type: 'tool-searchPdfSources', toolCallId: 't3', state: 'output-available', input: { query: 'aliases' },
        output: { sources: [{ sourceId: 'pdf-1', title: 'dutchyyy-timeline.pdf', url: 'https://x.supabase.co/a.pdf', preview: '…' }] },
    };
    expect(getChatProgress(assistant([search, { ...discover, state: 'input-available', output: undefined }]))).toBe('Searching Lore PDFs…');
    expect(getChatProgress(assistant([discover, { type: 'tool-readPdfSource', toolCallId: 't4', state: 'input-available', input: { sourceId: 'pdf-1' } }])))
        .toBe('Reading dutchyyy-timeline.pdf…');
    expect(getChatProgress(assistant([{ type: 'tool-readPdfSource', toolCallId: 't4', state: 'output-available', input: { sourceId: 'pdf-9' },
        output: { sourceId: 'pdf-9', n: 1, title: 'liner-notes.pdf', pages: 4, sha256: 'x' } }])))
        .toBe('Reading liner-notes.pdf…');
    expect(getChatProgress(assistant([{ type: 'tool-readNamedPdf', toolCallId: 't5', state: 'input-available', input: { filename: 'press-kit.pdf' } }])))
        .toBe('Reading press-kit.pdf…');
    expect(getChatProgress(assistant([{ type: 'tool-readPdfSource', toolCallId: 't4', state: 'input-available', input: { sourceId: 'unknown' } }])))
        .toBe('Reading a PDF…');
});

describe('the passage tools', () => {
    // Output shapes from MusicNerdAPI's createSearchPassagesTool, createReadUnitsTool and createListDocumentsTool.
    const doc = { n: 3, sourceKind: 'vault', sourceId: '0b6c1f9e-4d7a-4c1e-9a43-2f5a8f1e7b20', revision: 'r1', title: 'Dutchy timeline', url: null };
    const passages = {
        type: 'tool-searchPassages', toolCallId: 's1', state: 'output-available', input: { query: 'aliases' },
        output: { results: [{ n: 3, locator: 'p.4', title: 'Dutchy timeline', passage: '…' }], weak: false, truncated: false,
            documents: [{ ...doc, units: 12, shown: 1 }] },
    };
    const listing = {
        type: 'tool-listDocuments', toolCallId: 'l1', state: 'output-available', input: {},
        output: { documents: [{ n: 5, title: 'Press kit', kind: 'vault', url: 'https://x.example/kit.pdf', units: 4, indexing: false },
            { n: null, title: 'Unnumbered', kind: 'social', url: null, units: 1, indexing: false }] },
    };
    const read = (input: unknown, extra: Record<string, unknown> = {}) =>
        ({ type: 'tool-readUnits', toolCallId: 'r1', state: 'input-available', input, ...extra });

    it('says saved documents are being searched or listed', () => {
        expect(getChatProgress(assistant([{ ...passages, state: 'input-available', output: undefined }]))).toBe('Searching saved documents…');
        expect(getChatProgress(assistant([passages, { ...listing, state: 'input-available', output: undefined }]))).toBe('Listing saved documents…');
    });

    it('names the document being read, from its output or from the search or listing that numbered it', () => {
        expect(getChatProgress(assistant([read({ n: 9 }, { state: 'output-available',
            output: { n: 9, title: 'Liner notes', units: [], truncated: false, missing: [], documents: [{ ...doc, n: 9, title: 'Liner notes' }] } })])))
            .toBe('Reading Liner notes…');
        expect(getChatProgress(assistant([passages, read({ n: 3 })]))).toBe('Reading Dutchy timeline…');
        expect(getChatProgress(assistant([listing, read({ n: 5 })]))).toBe('Reading Press kit…');
    });

    it('names a document an earlier answer numbered, from the source part the turn re-sent for it', () => {
        expect(getChatProgress(assistant([
            { type: 'source-url', sourceId: '7', url: 'musicnerd://vault/0b6c1f9e-4d7a-4c1e-9a43-2f5a8f1e7b20', title: 'Old interview' },
            read({ n: 7 }),
        ]))).toBe('Reading Old interview…');
    });

    it('adds the locator when exactly one was asked for', () => {
        expect(getChatProgress(assistant([passages, read({ n: 3, locators: ['p.4'] })]))).toBe('Reading Dutchy timeline, p.4…');
        expect(getChatProgress(assistant([passages, read({ n: 3, locators: ['p.4', 'p.5'] })]))).toBe('Reading Dutchy timeline…');
    });

    it('falls back when the document is not known', () => {
        expect(getChatProgress(assistant([listing, read({ n: 8, locators: ['p.2'] })]))).toBe('Reading a saved document…');
        expect(getChatProgress(assistant([read({ n: 1 }, { state: 'output-available', output: { error: 'Unknown document number' } })])))
            .toBe('Reading a saved document…');
    });
});

it('ignores null and non-object entries in a tool output\'s list', () => {
    expect(getChatProgress(assistant([
        { type: 'tool-searchPassages', toolCallId: 's', state: 'output-available', input: { query: 'q' }, output: { documents: [null, 'x', { n: 2, title: 'Bio' }] } },
        { type: 'tool-readUnits', toolCallId: 'r', state: 'input-available', input: { n: 2 } },
    ]))).toBe('Reading Bio…');
    expect(getChatProgress(assistant([
        { type: 'tool-searchSources', toolCallId: 's', state: 'output-available', input: { query: 'q' }, output: { sources: [null, 3, { sourceId: 'v', title: 'Bio' }] } },
        { type: 'tool-readSource', toolCallId: 'r', state: 'input-available', input: { sourceId: 'v' } },
    ]))).toBe('Reading Bio…');
});
