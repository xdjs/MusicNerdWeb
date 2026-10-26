import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AskAboutArtist from '../AskAboutArtist';
import { runArtistResearch } from '@/lib/questionResearch/runArtistResearch';
const mockTrackEvent = jest.fn();
jest.mock('@/lib/analytics/trackEvent', () => ({ trackEvent: (...args: unknown[]) => mockTrackEvent(...args) }));
jest.mock('@/lib/questionResearch/runArtistResearch', () => ({ runArtistResearch: jest.fn() }));
const research = jest.mocked(runArtistResearch);
beforeEach(() => { research.mockReset(); mockTrackEvent.mockReset(); });
function ask() {
    render(<AskAboutArtist artistId="a1" artistName="Artist" />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Who played drums?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit question' }));
}
const source = (n: number) => ({ n, title: `Source ${n}`, url: `https://example.com/${n}` });

it('sends ask_question answered with the cited source count once the API answers', async () => {
    research.mockResolvedValue({ answer: 'The drummer.[1][2]', sources: [source(1), source(2)] });
    ask();
    await screen.findByTestId('answer');
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenCalledWith('ask_question', { outcome: 'answered', sources: 2 });
});

it('sends ask_question open_web when the answer came from the open web', async () => {
    research.mockResolvedValue({ answer: 'From the web.', sources: [source(1)], fromOpenWeb: true });
    ask();
    await screen.findByTestId('answer');
    expect(mockTrackEvent).toHaveBeenCalledWith('ask_question', { outcome: 'open_web', sources: 1 });
});

it.each([
    ['an error body', () => research.mockResolvedValue({ error: 'Research could not finish.' })],
    ['a failed request', () => research.mockRejectedValue(new Error('offline'))],
])('sends ask_question error for %s', async (_label, arrange) => {
    arrange();
    ask();
    await screen.findByRole('button', { name: 'Try again' });
    expect(mockTrackEvent).toHaveBeenCalledWith('ask_question', { outcome: 'error', sources: 0 });
});

it('sends nothing for a quota notice, which is not an answer', async () => {
    research.mockResolvedValue({ quota: { code: 'visitor_question_quota' }, error: 'Limit reached.' });
    ask();
    await waitFor(() => expect(research).toHaveBeenCalled());
    await screen.findByText(/question limit/i);
    expect(mockTrackEvent).not.toHaveBeenCalled();
});
