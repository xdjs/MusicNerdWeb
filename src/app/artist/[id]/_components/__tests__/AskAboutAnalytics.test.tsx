import { render } from '@testing-library/react';
import { useChat } from '@ai-sdk/react';
import AskAboutArtist from '../AskAboutArtist';

const mockTrackEvent = jest.fn();
jest.mock('@/lib/analytics/trackEvent', () => ({ trackEvent: (...args: unknown[]) => mockTrackEvent(...args) }));
const chat = jest.mocked(useChat);

type Callbacks = { onFinish: (event: Record<string, unknown>) => void; onError: (error: Error) => void };
function callbacks(): Callbacks {
    chat.mockReturnValue({ messages: [], status: 'ready', sendMessage: jest.fn(), stop: jest.fn(), regenerate: jest.fn() } as never);
    render(<AskAboutArtist artistId="a1" artistName="Artist" />);
    return chat.mock.calls.at(-1)![0] as unknown as Callbacks;
}
const source = (n: number) => ({ type: 'source-url', sourceId: String(n), url: `https://example.com/${n}`, title: `Source ${n}` });
const answer = (parts: unknown[]) => ({ id: 'a1', role: 'assistant', parts });
const finished = { isAbort: false, isDisconnect: false, isError: false };

beforeEach(() => { jest.clearAllMocks(); });

it('sends ask_question answered with the cited source count when the stream finishes', () => {
    callbacks().onFinish({ ...finished, message: answer([source(1), source(2), source(3), { type: 'text', text: 'The drummer.[1][2]' }]) });
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenCalledWith('ask_question', { outcome: 'answered', sources: 2 });
});

it('sends ask_question open_web when the answer searched the web', () => {
    callbacks().onFinish({ ...finished, message: answer([{ type: 'tool-webSearch', toolCallId: 't', state: 'output-available', input: {}, output: {} },
        source(1), { type: 'text', text: 'From the web [1].' }]) });
    expect(mockTrackEvent).toHaveBeenCalledWith('ask_question', { outcome: 'open_web', sources: 1 });
});

it('sends nothing for a stopped stream, and leaves an error to onError', () => {
    const { onFinish } = callbacks();
    onFinish({ ...finished, isAbort: true, message: answer([]) });
    onFinish({ ...finished, isError: true, message: answer([]) });
    expect(mockTrackEvent).not.toHaveBeenCalled();
});

it('sends error for a failed request but nothing for a quota notice, which is not an answer', () => {
    const { onError } = callbacks();
    onError(Object.assign(new Error('quota'), { statusCode: 429, responseBody: JSON.stringify({ code: 'visitor_question_quota' }) }));
    expect(mockTrackEvent).not.toHaveBeenCalled();
    onError(new Error('offline'));
    expect(mockTrackEvent).toHaveBeenCalledWith('ask_question', { outcome: 'error', sources: 0 });
});
