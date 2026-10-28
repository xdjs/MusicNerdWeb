import type { UIMessage } from 'ai';
import { getMessageText } from '../getMessageText';

it('joins a message\'s text parts and skips every other part', () => {
    const message = { id: 'm1', role: 'assistant', parts: [
        { type: 'text', text: 'First step. ' },
        { type: 'tool-searchSources', toolCallId: 't1', state: 'input-available', input: {} },
        { type: 'source-url', sourceId: '1', url: 'https://example.com', title: 'x' },
        { type: 'text', text: 'Answer [1].' },
    ] } as UIMessage;
    expect(getMessageText(message)).toBe('First step. Answer [1].');
});

it('is empty for no message', () => {
    expect(getMessageText(undefined)).toBe('');
});
