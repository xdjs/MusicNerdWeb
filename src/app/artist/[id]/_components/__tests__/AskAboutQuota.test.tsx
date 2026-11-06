import { act, fireEvent, render, screen } from '@testing-library/react';
import { useChat } from '@ai-sdk/react';
import AskAboutArtist from '../AskAboutArtist';

const chat = jest.mocked(useChat);
const sendMessage = jest.fn();
const regenerate = jest.fn();
const START = new Date('2026-10-27T19:00:00Z');
const QUESTION = 'Who played drums?';

/** What `DefaultChatTransport` throws for the endpoint's 429 (an `APICallError`). */
function quotaError(code = 'visitor_question_quota', resetAt = new Date(START.getTime() + 3000).toISOString()) {
    return Object.assign(new Error('quota'), {
        statusCode: 429,
        responseBody: JSON.stringify({ status: 'error', code, resetAt, retryAfterSeconds: 3, error: 'Internal budget name should not appear.' }),
    });
}
function limited(error = quotaError()) {
    chat.mockReturnValue({ messages: [{ id: 'u1', role: 'user', parts: [{ type: 'text', text: QUESTION }] }], status: 'error', error,
        sendMessage, stop: jest.fn(), regenerate } as never);
    return render(<AskAboutArtist artistId="a1" artistName="Artist" />);
}
beforeEach(() => { jest.clearAllMocks(); jest.useFakeTimers(); jest.setSystemTime(START); });
afterEach(() => { jest.useRealTimers(); });

it('shows the allowance notice, blocks new questions until the reset, then permits an explicit retry', async () => {
    limited();
    expect(screen.getByText("You've reached your question limit for this hour.")).toBeVisible();
    expect(screen.queryByText(/Internal budget/)).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Another?' } });
    expect(screen.getByRole('button', { name: 'Submit question' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'How did Artist get started?' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    expect(screen.getByText(/Available in 3s/)).toBeVisible();
    expect(screen.getByText(/Resets at/).querySelector('time')).toHaveAttribute('dateTime', new Date(START.getTime() + 3000).toISOString());

    await act(async () => { await jest.advanceTimersByTimeAsync(3000); });
    expect(screen.getByText('You can try again now.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Submit question' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(regenerate).toHaveBeenCalledTimes(1);
    expect(sendMessage).not.toHaveBeenCalled();
});

it('keeps a quota without reset metadata explicit instead of offering an immediate retry', () => {
    limited(Object.assign(new Error('quota'), { statusCode: 429, responseBody: JSON.stringify({ code: 'question_planning_quota' }) }));
    expect(screen.getByText('Music Nerd has reached its daily chat allowance.')).toBeVisible();
    expect(screen.getByText('Please try again later.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
});

it('blocks only the same question when outside research is what ran out', () => {
    limited(quotaError('research_quota', new Date(START.getTime() + 60_000).toISOString()));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: QUESTION } });
    expect(screen.getByRole('button', { name: 'Submit question' })).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'What about saved sources?' } });
    expect(screen.getByRole('button', { name: 'Submit question' })).toBeEnabled();
});
