import type { UIMessage } from 'ai';
import { getWebSearchUrls } from '../getWebSearchUrls';

it('collects the result URLs of every finished webSearch step', () => {
    const message = { id: 'm1', role: 'assistant', parts: [
        { type: 'tool-webSearch', toolCallId: 't1', state: 'output-available', input: { query: 'a' },
            output: { results: [{ n: 1, title: 'A', url: 'https://a.example', snippet: '' }] } },
        { type: 'tool-webSearch', toolCallId: 't2', state: 'input-available', input: { query: 'b' } },
        { type: 'tool-readSource', toolCallId: 't3', state: 'output-available', input: { sourceId: 'x' },
            output: { n: 2, title: 'B', url: 'https://b.example', text: '' } },
    ] } as UIMessage;
    expect(getWebSearchUrls(message)).toEqual(new Set(['https://a.example']));
});

it('is empty when the web search found nothing', () => {
    const message = { id: 'm1', role: 'assistant', parts: [
        { type: 'tool-webSearch', toolCallId: 't1', state: 'output-available', input: { query: 'a' }, output: { results: [] } },
    ] } as UIMessage;
    expect(getWebSearchUrls(message).size).toBe(0);
});
