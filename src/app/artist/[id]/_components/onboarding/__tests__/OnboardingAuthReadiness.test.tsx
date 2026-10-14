import { StrictMode } from 'react';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import OnboardingChat from '../OnboardingChat';
import { useOnboardingChat } from '../useOnboardingChat';

const mockGetAccessToken = jest.fn<Promise<string | null>, []>();
let mockAuth = { ready: false, authenticated: false };
jest.mock('@privy-io/react-auth', () => ({
    getAccessToken: () => mockGetAccessToken(),
    // A fresh SDK wrapper must not re-trigger automatic opening on rerender.
    usePrivy: () => ({ ...mockAuth, getAccessToken: () => mockGetAccessToken() }),
}));
jest.mock('../useResearchPump', () => ({ useResearchPump: jest.fn() }));
jest.mock('../useOnboardingProgress', () => ({
    useOnboardingProgress: (_id: string, initial: object) => ({ ...initial, stalled: false, resetStall: jest.fn() }),
}));

const props = {
    artistId: 'artist-1', artistName: 'Nova Reyes', onSkip: jest.fn(), onFinish: jest.fn(),
    initialState: { complete: false, currentStep: 'profiles' as const,
        steps: { profiles: null, vault: null, interview: null, publish: null } },
};

function streamResponse() {
    let delivered = false;
    return { ok: true, body: { getReader: () => ({ read: async () => {
        if (delivered) return { done: true, value: undefined };
        delivered = true;
        return { done: false, value: new TextEncoder().encode('data: {"kind":"complete"}\n\n') };
    } }) } };
}

beforeEach(() => {
    jest.useFakeTimers();
    mockAuth = { ready: false, authenticated: false };
    mockGetAccessToken.mockReset().mockResolvedValue('valid-token');
    (global.fetch as jest.Mock).mockReset().mockImplementation(async () => streamResponse());
});
afterEach(() => jest.useRealTimers());

it('waits for ready and authenticated, then opens once despite StrictMode and rerenders', async () => {
    const view = () => <StrictMode><OnboardingChat {...props} /></StrictMode>;
    const { rerender } = render(view());
    await act(async () => {});
    expect(mockGetAccessToken).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();

    mockAuth = { ready: true, authenticated: false };
    rerender(view());
    await act(async () => {});
    expect(fetch).not.toHaveBeenCalled();

    mockAuth = { ready: true, authenticated: true };
    await act(async () => { rerender(view()); });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(mockGetAccessToken).toHaveBeenCalledTimes(1);
    await act(async () => { rerender(view()); });
    expect(fetch).toHaveBeenCalledTimes(1);
});

it('recovers a transient null token before sending the one automatic opening turn', async () => {
    mockAuth = { ready: true, authenticated: true };
    mockGetAccessToken.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    const { rerender } = render(<OnboardingChat {...props} />);
    await act(async () => {});
    expect(fetch).not.toHaveBeenCalled();
    rerender(<OnboardingChat {...props} />);
    await act(async () => { await jest.advanceTimersByTimeAsync(1000); });
    expect(mockGetAccessToken).toHaveBeenCalledTimes(3);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect((fetch as jest.Mock).mock.calls[0][1].headers.Authorization).toBe('Bearer valid-token');
    expect(screen.queryByText('Not signed in')).not.toBeInTheDocument();
});

it('never sends an empty token, stops bounded retries, and permits an explicit retry', async () => {
    mockAuth = { ready: true, authenticated: true };
    mockGetAccessToken.mockResolvedValue(null);
    render(<OnboardingChat {...props} />);
    await act(async () => { await jest.advanceTimersByTimeAsync(2500); });
    expect(mockGetAccessToken).toHaveBeenCalledTimes(5);
    expect(fetch).not.toHaveBeenCalled();
    await act(async () => { await jest.advanceTimersByTimeAsync(10000); });
    expect(mockGetAccessToken).toHaveBeenCalledTimes(5);
    mockGetAccessToken.mockResolvedValue('valid-token');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /try again/i })); });
    expect(fetch).toHaveBeenCalledTimes(1);
});

it('does not send a turn for a genuinely signed-out account, even through the hook', async () => {
    mockAuth = { ready: true, authenticated: false };
    const { result } = renderHook(() => useOnboardingChat('artist-1'));
    await act(async () => { await result.current.sendTurn({ type: 'open' }); });
    expect(mockGetAccessToken).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(result.current.busy).toBe(false);
});

it('blocks overlapping sends while the first token lookup is pending', async () => {
    mockAuth = { ready: true, authenticated: true };
    let resolveToken!: (token: string) => void;
    mockGetAccessToken.mockImplementationOnce(() => new Promise(resolve => { resolveToken = resolve; }));
    const { result } = renderHook(() => useOnboardingChat('artist-1'));
    await act(async () => {
        const first = result.current.sendTurn({ type: 'open' });
        const duplicate = result.current.sendTurn({ type: 'open' });
        resolveToken('valid-token');
        await Promise.all([first, duplicate]);
    });
    expect(mockGetAccessToken).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(1);
});

it('does not send after signing out while a token is being restored', async () => {
    mockAuth = { ready: true, authenticated: true };
    mockGetAccessToken.mockResolvedValueOnce(null);
    const { rerender } = render(<OnboardingChat {...props} />);
    await act(async () => {});
    mockAuth = { ready: true, authenticated: false };
    rerender(<OnboardingChat {...props} />);
    await act(async () => { await jest.advanceTimersByTimeAsync(2500); });
    expect(fetch).not.toHaveBeenCalled();
    mockAuth = { ready: true, authenticated: true };
    await act(async () => { rerender(<OnboardingChat {...props} />); });
    expect(fetch).toHaveBeenCalledTimes(1);
});

it('opens once when Privy is already ready during StrictMode mount', async () => {
    mockAuth = { ready: true, authenticated: true };
    render(<StrictMode><OnboardingChat {...props} /></StrictMode>);
    await act(async () => {});
    expect(fetch).toHaveBeenCalledTimes(1);
});

it('does not automatically replay a genuine API rejection', async () => {
    mockAuth = { ready: true, authenticated: true };
    (fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Not your artist' }) });
    const { rerender } = render(<OnboardingChat {...props} />);
    await act(async () => {});
    expect(screen.getByText('Not your artist')).toBeInTheDocument();
    mockAuth = { ready: true, authenticated: false };
    rerender(<OnboardingChat {...props} />);
    mockAuth = { ready: true, authenticated: true };
    await act(async () => { rerender(<OnboardingChat {...props} />); await jest.advanceTimersByTimeAsync(5000); });
    expect(fetch).toHaveBeenCalledTimes(1);
});

it('does not send after leaving during token readiness', async () => {
    mockAuth = { ready: true, authenticated: true };
    mockGetAccessToken.mockResolvedValueOnce(null);
    const { unmount } = render(<OnboardingChat {...props} />);
    await act(async () => {});
    unmount();
    await act(async () => { await jest.advanceTimersByTimeAsync(2500); });
    expect(fetch).not.toHaveBeenCalled();
});
