/// <reference types="@testing-library/jest-dom" />
import '@testing-library/jest-dom';

// --- Mocks (must be declared before imports) ---

const mockPush = jest.fn();
const mockToast = jest.fn();
const mockLogin = jest.fn();
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
    useLogin: () => ({ login: mockLogin }),
}));

jest.mock('@/app/actions/addArtist', () => ({
    addArtist: (...args: unknown[]) => mockAddArtist(...args),
}));

jest.mock('use-debounce', () => ({
    useDebounce: (val: string) => [val],
}));

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useSession } from 'next-auth/react';

import SearchBar from '@/app/_components/nav/components/SearchBar';

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

const spotifyOnlyResult2 = {
    name: 'Other Artist',
    spotify: '6def456',
    isSpotifyOnly: true,
    images: [{ url: 'https://img.spotify.com/test2.jpg', height: 64, width: 64 }],
};

const dbResult = {
    id: '42',
    name: 'Existing Artist',
    spotify: '6xyz789',
    isSpotifyOnly: false,
    bandcamp: 'existingartist',
};

describe('SearchBar Add Artist Flow', () => {
    let mockSessionStorage: Record<string, string>;

    beforeEach(() => {
        jest.clearAllMocks();
        (useSession as jest.Mock).mockReturnValue({ data: null });
        // Mock sessionStorage
        mockSessionStorage = {};
        jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => mockSessionStorage[key] ?? null);
        jest.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => { mockSessionStorage[key] = value; });
        jest.spyOn(Storage.prototype, 'removeItem').mockImplementation((key) => { delete mockSessionStorage[key]; });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    async function renderAndSearch(results: object[]) {
        mockSearchResults(results);
        render(<SearchBar />);
        const input = screen.getByPlaceholderText('Search for an artist...');
        fireEvent.change(input, { target: { value: 'test' } });
        fireEvent.focus(input);
        const firstName = (results[0] as { name: string }).name;
        await waitFor(() => {
            expect(screen.getByText(firstName)).toBeInTheDocument();
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

    it('calls login() and stores pending ID + timestamp when unauthenticated user clicks a Spotify-only result', async () => {
        await renderAndSearch([spotifyOnlyResult]);

        fireEvent.click(screen.getByText('New Artist'));

        expect(mockLogin).toHaveBeenCalled();
        expect(mockAddArtist).not.toHaveBeenCalled();
        expect(mockSessionStorage['pendingAddArtistSpotifyId']).toBe('6abc123');
        expect(mockSessionStorage['pendingAddArtistTimestamp']).toBeDefined();
    });

    it('completes pending add on mount when session exists and pending ID is fresh', async () => {
        (useSession as jest.Mock).mockReturnValue({ data: { user: { id: '1' } } });
        mockSessionStorage['pendingAddArtistSpotifyId'] = '6abc123';
        mockSessionStorage['pendingAddArtistTimestamp'] = String(Date.now());
        mockAddArtist.mockResolvedValue({ status: 'success', artistId: '99', artistName: 'New Artist' });

        mockSearchResults([]);
        await act(async () => {
            render(<SearchBar />);
        });

        await waitFor(() => {
            expect(mockAddArtist).toHaveBeenCalledWith('6abc123');
            expect(mockPush).toHaveBeenCalledWith('/artist/99');
        });
        expect(mockSessionStorage['pendingAddArtistSpotifyId']).toBeUndefined();
        expect(mockSessionStorage['pendingAddArtistTimestamp']).toBeUndefined();
    });

    it('discards stale pending add (older than 5 minutes)', async () => {
        (useSession as jest.Mock).mockReturnValue({ data: { user: { id: '1' } } });
        mockSessionStorage['pendingAddArtistSpotifyId'] = '6abc123';
        mockSessionStorage['pendingAddArtistTimestamp'] = String(Date.now() - 6 * 60 * 1000);

        mockSearchResults([]);
        await act(async () => {
            render(<SearchBar />);
        });

        await act(async () => {});

        expect(mockAddArtist).not.toHaveBeenCalled();
        // Keys should still be cleaned up even if expired
        expect(mockSessionStorage['pendingAddArtistSpotifyId']).toBeUndefined();
    });

    it('does not trigger pending add when there is no session', async () => {
        mockSessionStorage['pendingAddArtistSpotifyId'] = '6abc123';
        mockSessionStorage['pendingAddArtistTimestamp'] = String(Date.now());

        mockSearchResults([]);
        render(<SearchBar />);

        await act(async () => {});

        expect(mockAddArtist).not.toHaveBeenCalled();
        // Pending ID should still be in storage (waiting for session)
        expect(mockSessionStorage['pendingAddArtistSpotifyId']).toBe('6abc123');
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

    it('shows error toast when addArtist fails and keeps dropdown open', async () => {
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
        // Dropdown should still be visible on error
        expect(screen.getByText('Add to MusicNerd')).toBeInTheDocument();
    });

    it('shows error toast when addArtist throws and keeps dropdown open', async () => {
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
        // Dropdown should still be visible on error
        expect(screen.getByText('Add to MusicNerd')).toBeInTheDocument();
    });

    it('navigates to artist page for existing DB results', async () => {
        await renderAndSearch([dbResult]);

        fireEvent.click(screen.getByText('Existing Artist'));

        expect(mockPush).toHaveBeenCalledWith('/artist/42');
        expect(mockAddArtist).not.toHaveBeenCalled();
    });

    it('only disables the specific result being added, not others', async () => {
        (useSession as jest.Mock).mockReturnValue({ data: { user: { id: '1' } } });
        let resolveAdd!: (val: unknown) => void;
        mockAddArtist.mockReturnValue(new Promise(r => { resolveAdd = r; }));

        await renderAndSearch([spotifyOnlyResult, spotifyOnlyResult2, dbResult]);

        // Click the first Spotify-only result
        fireEvent.click(screen.getByText('New Artist'));

        await waitFor(() => {
            // The clicked result shows "Adding..." and is disabled
            expect(screen.getByText('Adding...')).toBeInTheDocument();
            const addingButton = screen.getByText('Adding...').closest('button');
            expect(addingButton).toBeDisabled();

            // The other Spotify result is NOT disabled
            const otherButton = screen.getByText('Other Artist').closest('button');
            expect(otherButton).not.toBeDisabled();

            // The DB result is NOT disabled
            const dbButton = screen.getByText('Existing Artist').closest('button');
            expect(dbButton).not.toBeDisabled();
        });

        // Resolve to clean up
        resolveAdd({ status: 'success', artistId: '99' });
    });

    it('closes dropdown only on success, not during add', async () => {
        (useSession as jest.Mock).mockReturnValue({ data: { user: { id: '1' } } });
        mockAddArtist.mockResolvedValue({ status: 'success', artistId: '99', artistName: 'New Artist' });

        await renderAndSearch([spotifyOnlyResult]);
        fireEvent.click(screen.getByText('New Artist'));

        // After success, dropdown should close
        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith('/artist/99');
            expect(screen.queryByText('Add to MusicNerd')).not.toBeInTheDocument();
        });
    });
});
