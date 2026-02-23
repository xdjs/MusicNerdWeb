/// <reference types="@testing-library/jest-dom" />
import '@testing-library/jest-dom';

// --- Mocks (must be declared before imports) ---

const mockPush = jest.fn();
const mockToast = jest.fn();
const mockLogin = jest.fn();
let loginOnComplete: (() => void) | undefined;
const mockAddArtist = jest.fn();

jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: mockPush }),
    useSearchParams: () => ({ get: () => null }),
}));

jest.mock('@/hooks/use-toast', () => ({
    useToast: () => ({ toast: mockToast }),
}));

jest.mock('next-auth/react', () => ({
    useSession: jest.fn(() => ({ data: null })),
}));

jest.mock('@privy-io/react-auth', () => ({
    useLogin: (opts?: { onComplete?: () => void }) => {
        loginOnComplete = opts?.onComplete;
        return { login: mockLogin };
    },
}));

jest.mock('@/app/actions/addArtist', () => ({
    addArtist: (...args: unknown[]) => mockAddArtist(...args),
}));

jest.mock('use-debounce', () => ({
    useDebounce: (val: string) => [val],
}));

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

// We need to import the inner component. Since SearchBar wraps in its own
// QueryClientProvider, we import the default export which handles that.
import SearchBar from '@/app/_components/nav/components/SearchBar';

// Helper to make the search results visible by mocking the fetch response
function mockSearchResults(results: object[]) {
    global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ results }),
    });
}

const spotifyOnlyResult = {
    name: 'New Artist',
    spotify: '6abc123',
    isSpotifyOnly: true,
    images: [{ url: 'https://img.spotify.com/test.jpg', height: 64, width: 64 }],
};

const dbResult = {
    id: '42',
    name: 'Existing Artist',
    spotify: '6xyz789',
    isSpotifyOnly: false,
    bandcamp: 'existingartist',
};

describe('SearchBar Add Artist Flow', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        loginOnComplete = undefined;
        (useSession as jest.Mock).mockReturnValue({ data: null });
    });

    async function renderAndSearch(results: object[]) {
        mockSearchResults(results);
        render(<SearchBar />);
        const input = screen.getByPlaceholderText('Search for an artist...');
        fireEvent.change(input, { target: { value: 'test' } });
        fireEvent.focus(input);
        // Wait for results to appear
        await waitFor(() => {
            expect(screen.getByText(results[0] && 'name' in results[0] ? (results[0] as { name: string }).name : '')).toBeInTheDocument();
        });
    }

    it('shows "Add to MusicNerd | View on Spotify" for Spotify-only results', async () => {
        await renderAndSearch([spotifyOnlyResult]);

        expect(screen.getByText('Add to MusicNerd')).toBeInTheDocument();
        expect(screen.getByText('View on Spotify')).toBeInTheDocument();
        expect(screen.getByText('|')).toBeInTheDocument();
    });

    it('renders "View on Spotify" as an <a> tag with correct href', async () => {
        await renderAndSearch([spotifyOnlyResult]);

        const link = screen.getByText('View on Spotify').closest('a');
        expect(link).toHaveAttribute('href', 'https://open.spotify.com/artist/6abc123');
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('calls login() when unauthenticated user clicks a Spotify-only result', async () => {
        await renderAndSearch([spotifyOnlyResult]);

        fireEvent.click(screen.getByText('New Artist'));

        expect(mockLogin).toHaveBeenCalled();
        expect(mockAddArtist).not.toHaveBeenCalled();
    });

    it('auto-retries add after login completes via onComplete callback', async () => {
        // Start unauthenticated
        (useSession as jest.Mock).mockReturnValue({ data: null });
        await renderAndSearch([spotifyOnlyResult]);

        // Click triggers login
        fireEvent.click(screen.getByText('New Artist'));
        expect(mockLogin).toHaveBeenCalled();

        // Simulate login completing — session is now available and onComplete fires
        mockAddArtist.mockResolvedValue({ status: 'success', artistId: '99', artistName: 'New Artist' });

        // Fire the onComplete callback (Privy calls this after successful login)
        expect(loginOnComplete).toBeDefined();
        await loginOnComplete!();

        expect(mockAddArtist).toHaveBeenCalledWith('6abc123');
        expect(mockPush).toHaveBeenCalledWith('/artist/99');
    });

    it('calls addArtist and navigates on success when authenticated', async () => {
        (useSession as jest.Mock).mockReturnValue({ data: { user: { id: '1' } } });
        mockAddArtist.mockResolvedValue({ status: 'success', artistId: '99', artistName: 'New Artist' });

        await renderAndSearch([spotifyOnlyResult]);
        fireEvent.click(screen.getByText('New Artist'));

        await waitFor(() => {
            expect(mockAddArtist).toHaveBeenCalledWith('6abc123');
            expect(mockPush).toHaveBeenCalledWith('/artist/99');
        });
    });

    it('handles "exists" status by navigating to existing artist', async () => {
        (useSession as jest.Mock).mockReturnValue({ data: { user: { id: '1' } } });
        mockAddArtist.mockResolvedValue({ status: 'exists', artistId: '42', artistName: 'New Artist' });

        await renderAndSearch([spotifyOnlyResult]);
        fireEvent.click(screen.getByText('New Artist'));

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith('/artist/42');
        });
    });

    it('shows error toast when addArtist fails', async () => {
        (useSession as jest.Mock).mockReturnValue({ data: { user: { id: '1' } } });
        mockAddArtist.mockResolvedValue({ status: 'error', message: 'Spotify API down' });

        await renderAndSearch([spotifyOnlyResult]);
        fireEvent.click(screen.getByText('New Artist'));

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
                variant: 'destructive',
                description: 'Spotify API down',
            }));
        });
        expect(mockPush).not.toHaveBeenCalled();
    });

    it('shows error toast when addArtist throws', async () => {
        (useSession as jest.Mock).mockReturnValue({ data: { user: { id: '1' } } });
        mockAddArtist.mockRejectedValue(new Error('Network error'));

        await renderAndSearch([spotifyOnlyResult]);
        fireEvent.click(screen.getByText('New Artist'));

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
                variant: 'destructive',
                description: 'Failed to add artist - please try again',
            }));
        });
    });

    it('navigates to artist page for existing DB results', async () => {
        await renderAndSearch([dbResult]);

        fireEvent.click(screen.getByText('Existing Artist'));

        expect(mockPush).toHaveBeenCalledWith('/artist/42');
        expect(mockAddArtist).not.toHaveBeenCalled();
    });

    it('hides results dropdown while adding an artist', async () => {
        (useSession as jest.Mock).mockReturnValue({ data: { user: { id: '1' } } });
        let resolveAdd!: (val: unknown) => void;
        mockAddArtist.mockReturnValue(new Promise(r => { resolveAdd = r; }));

        await renderAndSearch([spotifyOnlyResult]);

        // Results are visible before clicking
        expect(screen.getByText('New Artist')).toBeInTheDocument();

        fireEvent.click(screen.getByText('New Artist'));

        // Results dropdown closes during add
        await waitFor(() => {
            expect(screen.queryByText('Add to MusicNerd')).not.toBeInTheDocument();
        });

        // Resolve to clean up
        resolveAdd({ status: 'success', artistId: '99' });
    });
});
