import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { musicNerdApiUrl } from '@/lib/musicNerdApi/musicNerdApiUrl';
import AskAboutArtist from '../AskAboutArtist';

const START = new Date('2026-10-15T19:00:00Z');
const QUESTION = 'Who played drums?';
function response(body: unknown, status = 200, quota = false): Response {
    return {
        ok: status < 400, status,
        headers: new Headers(quota ? { 'X-MusicNerd-Quota': 'true', 'Retry-After': '3' } : {}),
        json: async () => body,
        clone: () => ({ json: async () => body }),
    } as Response;
}
function quotaReply(code = 'question_planning_quota', resetAt = new Date(START.getTime() + 3000).toISOString()) {
    return response({ code, resetAt, retryAfterSeconds: 3, error: 'Internal budget name should not appear.' }, 429, true);
}
async function flush() { await act(async () => { await jest.advanceTimersByTimeAsync(0); }); }
function submit(question = QUESTION) {
    fireEvent.change(screen.getByRole('textbox'), { target: { value: question } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit question' }));
}
beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(START); });
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

it('keeps the draft, reports a site limit, and permits only an explicit retry after reset', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(quotaReply()).mockResolvedValueOnce(response({ answer: 'The credited drummer.' }));
    render(<AskAboutArtist artistId="a1" artistName="Artist" />);
    submit(); await flush();
    expect(screen.getByText('Music Nerd has reached its daily chat allowance.')).toBeVisible();
    expect(screen.queryByText(/Internal budget|your question limit/)).not.toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue(QUESTION);
    expect(screen.getByRole('button', { name: 'Submit question' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'How did Artist get started?' })).toBeDisabled();
    expect(screen.getByText(/Available in 3s/)).toBeVisible();
    expect(screen.getByText(/Resets at/).querySelector('time')).toHaveAttribute('dateTime', new Date(START.getTime() + 3000).toISOString());
    await act(async () => { await jest.advanceTimersByTimeAsync(3000); });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Submit question' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' })); await flush();
    expect(screen.getByTestId('answer')).toHaveTextContent('The credited drummer.');
    expect(screen.getAllByText(QUESTION)).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(2);
});

it('keeps a quota without reset metadata explicit instead of showing an immediate retry', async () => {
    const unknownReset = response({ code: 'question_planning_quota', error: 'Budget exhausted.' }, 429, true);
    unknownReset.headers.delete('Retry-After');
    global.fetch = jest.fn().mockResolvedValue(unknownReset);
    render(<AskAboutArtist artistId="a1" artistName="Artist" />);
    submit(); await flush();
    expect(screen.getByText('Please try again later.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    await act(async () => { await jest.advanceTimersByTimeAsync(120000); });
    expect(fetch).toHaveBeenCalledTimes(1);
});

it('does not extend an already expired reset using the original retryAfterSeconds', async () => {
    global.fetch = jest.fn().mockResolvedValue(quotaReply('visitor_question_quota', new Date(START.getTime() - 1000).toISOString()));
    render(<AskAboutArtist artistId="a1" artistName="Artist" />);
    submit(); await flush();
    expect(screen.getByText("You've reached your question limit for this hour.")).toBeVisible();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Submit question' })).toBeEnabled();
    expect(fetch).toHaveBeenCalledTimes(1);
});

it.each([200, 429])('allows another question when only outside research is exhausted (HTTP %s)', async status => {
    global.fetch = jest.fn().mockResolvedValueOnce(response({ code: 'research_quota', resetAt: new Date(START.getTime() + 60000).toISOString(), retryAfterSeconds: 60,
        ...(status === 200 ? { answer: 'Saved sources do not cover that yet. Outside research is at its limit. You can still ask about saved sources.' } : { error: 'Outside budget exhausted.' }) }, status, status === 429))
        .mockResolvedValueOnce(response({ answer: 'An answer from saved Lore.' }));
    render(<AskAboutArtist artistId="a1" artistName="Artist" />);
    submit(); await flush();
    expect(screen.getByText(/You can still ask about saved sources/)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit question' })).toBeDisabled();
    if (status === 200) {
        expect(screen.getByText(/Saved sources do not cover that yet/)).toBeVisible();
        expect(screen.getAllByText(/You can still ask about saved sources/)).toHaveLength(1);
        expect(screen.queryByText('AI-generated response')).not.toBeInTheDocument();
    }
    submit('How did Artist get started?'); await flush();
    expect(screen.getByTestId('answer')).toHaveTextContent('An answer from saved Lore.');
    expect(fetch).toHaveBeenCalledTimes(2);
    const body = JSON.parse(jest.mocked(fetch).mock.calls[1][1]!.body as string);
    expect(body.conversation).toBeUndefined(); // A budget notice is not a factual previous answer.
});

it('keeps earlier answers and any new draft typed while a question is in flight', async () => {
    let finish!: (value: Response) => void;
    global.fetch = jest.fn().mockResolvedValueOnce(response({ answer: 'Their latest record is OUT HERE.' }))
        .mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve; }));
    render(<AskAboutArtist artistId="a1" artistName="Artist" />);
    submit('Latest record?'); await flush(); submit(); await flush();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'A new draft I am writing' } });
    await act(async () => { finish(quotaReply('saved_evidence_quota')); }); await flush();
    expect(screen.getByTestId('answer')).toHaveTextContent('Their latest record is OUT HERE.');
    expect(screen.getByRole('textbox')).toHaveValue('A new draft I am writing');
    expect(within(screen.getByRole('log')).getByText(QUESTION)).toBeVisible();
    expect(fetch).toHaveBeenCalledTimes(2);
});

it('still waits and continues a transient throttle without showing a budget limit', async () => {
    const throttle = response({ error: 'Brief throttle.' }, 429);
    throttle.headers.set('Retry-After', '2');
    global.fetch = jest.fn().mockResolvedValueOnce(throttle).mockResolvedValueOnce(response({ answer: 'They played drums.' }));
    render(<AskAboutArtist artistId="a1" artistName="Artist" />);
    submit(); await flush();
    expect(screen.getByText('Waiting 2s, then continuing…')).toBeVisible();
    await act(async () => { await jest.advanceTimersByTimeAsync(2000); });
    expect(screen.getByTestId('answer')).toHaveTextContent('They played drums.');
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(/limit for now/)).not.toBeInTheDocument();
});

it('starts fresh after a terminal outside quota expires, keeping the original follow-up context', async () => {
    global.fetch = jest.fn()
        .mockResolvedValueOnce(response({ answer: 'Their latest record is OUT HERE.' }))
        .mockResolvedValueOnce(response({ research: { jobId: 'quota-job', stage: 'checking_saved', message: 'Checking', resolvedQuestion: 'Who played drums on OUT HERE?' } }, 202))
        .mockResolvedValueOnce(response({ jobId: 'quota-job', stage: 'complete', message: 'Checked' }))
        .mockResolvedValueOnce(response({ answer: 'Saved sources do not cover that yet.', code: 'research_quota', resetAt: new Date(START.getTime() + 3000).toISOString(), retryAfterSeconds: 3, retryFromStart: true }))
        .mockResolvedValueOnce(response({ answer: 'The credited drummer.' }));
    render(<AskAboutArtist artistId="a1" artistName="Artist" />);
    submit('Latest record?'); await flush();
    submit(); await flush();
    expect(fetch).toHaveBeenCalledTimes(4);
    await act(async () => { await jest.advanceTimersByTimeAsync(3000); });
    expect(fetch).toHaveBeenCalledTimes(4);
    // Submitting the restored draft also retries the existing conversation turn.
    fireEvent.click(screen.getByRole('button', { name: 'Submit question' })); await flush();
    expect(jest.mocked(fetch).mock.calls[4][0]).toBe(musicNerdApiUrl('/api/askArtist'));
    expect(JSON.parse(jest.mocked(fetch).mock.calls[4][1]!.body as string)).toMatchObject({
        question: QUESTION, conversation: [{ question: 'Latest record?', answer: 'Their latest record is OUT HERE.' }],
    });
    expect(screen.getAllByText(QUESTION)).toHaveLength(1);
    expect(screen.getByText('The credited drummer.')).toBeVisible();
});

it('does not overwrite a different draft when retrying a previous quota turn', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(quotaReply('visitor_question_quota', new Date(START.getTime() - 1000).toISOString()))
        .mockResolvedValueOnce(response({ answer: 'The credited drummer.' }));
    render(<AskAboutArtist artistId="a1" artistName="Artist" />);
    submit(); await flush();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'A different next question' } });
    fireEvent.click(screen.getByRole('button', { name: 'Try again' })); await flush();
    expect(screen.getByRole('textbox')).toHaveValue('A different next question');
    expect(screen.getByTestId('answer')).toHaveTextContent('The credited drummer.');
});
