// @ts-nocheck

/**
 * url-params.test.tsx
 *
 * Tests for URL parameter handling:
 *  1. SearchBar – reads ?search= param to pre-populate the input on mount.
 *  2. AddArtistPage – reads ?spotify= param; redirects unauthenticated users;
 *     handles missing or invalid Spotify IDs gracefully.
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';

// ─────────────────────────────────────────────────────────────────────────────
// Section 1: SearchBar – ?search= param
// ─────────────────────────────────────────────────────────────────────────────

// All mocks must be declared before any imports.

const mockPush = jest.fn();
let mockSearch: string | null = null;

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ get: (key: string) => (key === 'search' ? mockSearch : null) }),
  usePathname: jest.fn(() => '/'),
  redirect: jest.fn(),
}));

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({ data: null })),
}));

jest.mock('@privy-io/react-auth', () => ({
  useLogin: () => ({ login: jest.fn() }),
}));

jest.mock('@/app/actions/addArtist', () => ({
  addArtist: jest.fn(),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

// Disable debounce so the query value is used immediately
jest.mock('use-debounce', () => ({
  useDebounce: (val: string) => [val],
}));

import SearchBar from '@/app/_components/nav/components/SearchBar';
import { useSession } from 'next-auth/react';

describe('SearchBar – URL parameter handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearch = null;
    (useSession as jest.Mock).mockReturnValue({ data: null });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: [] }),
    });
  });

  it('renders the search input placeholder', () => {
    render(<SearchBar />);
    expect(screen.getByPlaceholderText('Search for an artist...')).toBeInTheDocument();
  });

  it('starts with an empty input when no ?search= param is present', async () => {
    mockSearch = null;
    render(<SearchBar />);

    await waitFor(() => {
      const input = screen.getByPlaceholderText('Search for an artist...') as HTMLInputElement;
      expect(input.value).toBe('');
    });
  });

  it('pre-populates the input from the ?search= URL parameter', async () => {
    mockSearch = 'Radiohead';
    render(<SearchBar />);

    await waitFor(() => {
      const input = screen.getByPlaceholderText('Search for an artist...') as HTMLInputElement;
      expect(input.value).toBe('Radiohead');
    });
  });

  it('fetches search results using the ?search= query on mount', async () => {
    mockSearch = 'Radiohead';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: [{ id: '1', name: 'Radiohead', isSpotifyOnly: false }] }),
    });

    render(<SearchBar />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/searchArtists',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Radiohead'),
        })
      );
    });
  });

  it('shows results from the pre-populated search query', async () => {
    mockSearch = 'Radiohead';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: [{ id: '1', name: 'Radiohead', isSpotifyOnly: false }] }),
    });

    render(<SearchBar />);

    await waitFor(() => {
      expect(screen.getByText('Radiohead')).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 2: AddArtistPage – ?spotify= param
// ─────────────────────────────────────────────────────────────────────────────

const mockGetServerAuthSession = jest.fn();
jest.mock('@/server/auth', () => ({
  getServerAuthSession: (...args) => mockGetServerAuthSession(...args),
}));

const mockGetSpotifyHeaders = jest.fn();
const mockGetSpotifyArtist = jest.fn();
jest.mock('@/server/utils/queries/externalApiQueries', () => ({
  getSpotifyHeaders: (...args) => mockGetSpotifyHeaders(...args),
  getSpotifyArtist: (...args) => mockGetSpotifyArtist(...args),
  getSpotifyImage: jest.fn().mockResolvedValue({ artistImage: null }),
  getNumberOfSpotifyReleases: jest.fn().mockResolvedValue(0),
}));

const mockRedirect = jest.fn(() => { throw new Error('NEXT_REDIRECT'); });
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ get: (key: string) => (key === 'search' ? mockSearch : null) }),
  usePathname: jest.fn(() => '/add-artist'),
  redirect: (...args) => mockRedirect(...args),
}));

jest.mock('@/app/add-artist/_components/AddArtistContent', () => function MockAddArtistContent() {
  return <div data-testid="add-artist-content" />;
});

import AddArtistPage from '@/app/add-artist/page';

describe('AddArtistPage – URL parameter handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSpotifyHeaders.mockResolvedValue({ Authorization: 'Bearer mock-token' });
  });

  it('redirects unauthenticated users to home', async () => {
    mockGetServerAuthSession.mockResolvedValue(null);

    await expect(
      AddArtistPage({ searchParams: Promise.resolve({ spotify: 'spotify-id-123' }) })
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mockRedirect).toHaveBeenCalledWith('/');
  });

  it('shows "No Spotify ID provided" when ?spotify= param is missing', async () => {
    mockGetServerAuthSession.mockResolvedValue({ user: { id: 'user-1' }, expires: '2099-01-01' });

    const jsx = await AddArtistPage({ searchParams: Promise.resolve({}) });
    render(jsx);

    expect(screen.getByText('No Spotify ID provided')).toBeInTheDocument();
  });

  it('renders AddArtistContent when artist is found', async () => {
    mockGetServerAuthSession.mockResolvedValue({ user: { id: 'user-1' }, expires: '2099-01-01' });
    mockGetSpotifyArtist.mockResolvedValue({
      data: { id: 'spotify-abc', name: 'Cool Artist', images: [] },
      error: null,
    });

    const jsx = await AddArtistPage({ searchParams: Promise.resolve({ spotify: 'spotify-abc' }) });
    render(jsx);

    expect(screen.getByTestId('add-artist-content')).toBeInTheDocument();
  });

  it('passes the correct Spotify ID to getSpotifyArtist', async () => {
    mockGetServerAuthSession.mockResolvedValue({ user: { id: 'user-1' }, expires: '2099-01-01' });
    mockGetSpotifyArtist.mockResolvedValue({
      data: { id: 'spotify-xyz', name: 'Some Artist', images: [] },
      error: null,
    });

    await AddArtistPage({ searchParams: Promise.resolve({ spotify: 'spotify-xyz' }) });

    expect(mockGetSpotifyArtist).toHaveBeenCalledWith(
      'spotify-xyz',
      expect.anything()
    );
  });

  it('shows error message when Spotify returns an error string', async () => {
    mockGetServerAuthSession.mockResolvedValue({ user: { id: 'user-1' }, expires: '2099-01-01' });
    mockGetSpotifyArtist.mockResolvedValue({
      data: null,
      error: 'Artist not found on Spotify',
    });

    const jsx = await AddArtistPage({ searchParams: Promise.resolve({ spotify: 'bad-id' }) });
    render(jsx);

    expect(screen.getByText('Artist not found on Spotify')).toBeInTheDocument();
  });

  it('shows fallback error when Spotify returns no data and no error', async () => {
    mockGetServerAuthSession.mockResolvedValue({ user: { id: 'user-1' }, expires: '2099-01-01' });
    mockGetSpotifyArtist.mockResolvedValue({ data: null, error: null });

    const jsx = await AddArtistPage({ searchParams: Promise.resolve({ spotify: 'some-id' }) });
    render(jsx);

    expect(screen.getByText('Failed to fetch artist data')).toBeInTheDocument();
  });
});
