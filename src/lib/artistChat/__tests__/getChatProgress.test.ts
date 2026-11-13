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
