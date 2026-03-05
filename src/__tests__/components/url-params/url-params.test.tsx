// @ts-nocheck
import React from 'react';
import { render, screen } from '@testing-library/react';

let mockSearchParam = null;
const mockPush = jest.fn();
const mockRedirect = jest.fn(() => { throw new Error('NEXT_REDIRECT'); });

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ get: (key) => (key === 'search' ? mockSearchParam : null) }),
  redirect: (...args) => mockRedirect(...args),
  notFound: jest.fn(),
}));

const mockGetServerAuthSession = jest.fn();
jest.mock('@/server/auth', () => ({
  getServerAuthSession: (...args) => mockGetServerAuthSession(...args),
}));

const mockGetSpotifyHeaders = jest.fn();
const mockGetSpotifyArtist = jest.fn();
jest.mock('@/server/utils/queries/externalApiQueries', () => ({
  getSpotifyHeaders: (...args) => mockGetSpotifyHeaders(...args),
  getSpotifyArtist: (...args) => mockGetSpotifyArtist(...args),
}));

jest.mock('use-debounce', () => ({ useDebounce: (val) => [val] }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: null, status: 'unauthenticated' }) }));
jest.mock('@privy-io/react-auth', () => ({ useLogin: () => ({ login: jest.fn() }) }));
jest.mock('@tanstack/react-query', () => ({
  QueryClient: jest.fn().mockImplementation(() => ({})),
  QueryClientProvider: function MockQCP({ children }) { return <>{children}</>; },
  useQuery: jest.fn(() => ({ data: [], isLoading: false })),
}));
jest.mock('@/app/actions/addArtist', () => ({ addArtist: jest.fn() }));
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: jest.fn() }) }));
jest.mock('@/components/ui/input', () => ({ Input: function MockInput(props) { return <input {...props} />; } }));
jest.mock('lucide-react', () => ({
  Search: () => <svg data-testid="search-icon" />,
  ExternalLink: () => <svg data-testid="external-link-icon" />,
}));
jest.mock('@/app/add-artist/_components/AddArtistContent', () =>
  function MockAddArtistContent() { return <div data-testid="add-artist-content" />; }
);

import SearchBar from '@/app/_components/nav/components/SearchBar';
import AddArtistPage from '@/app/add-artist/page';

describe('SearchBar – ?search= URL param', () => {
  beforeEach(() => { jest.clearAllMocks(); mockSearchParam = null; });

  it('pre-populates the search input from the ?search= param', () => {
    mockSearchParam = 'Radiohead';
    render(<SearchBar />);
    expect(screen.getByPlaceholderText('Search for an artist...')).toHaveValue('Radiohead');
  });

  it('leaves the input empty when there is no ?search= param', () => {
    render(<SearchBar />);
    expect(screen.getByPlaceholderText('Search for an artist...')).toHaveValue('');
  });

  it('pre-populates with a multi-word artist name', () => {
    mockSearchParam = 'The National';
    render(<SearchBar />);
    expect(screen.getByPlaceholderText('Search for an artist...')).toHaveValue('The National');
  });
});

describe('AddArtistPage – ?spotify= URL param', () => {
  beforeEach(() => { jest.clearAllMocks(); mockGetSpotifyHeaders.mockResolvedValue({ Authorization: 'Bearer test' }); });

  it('redirects to / when not authenticated', async () => {
    mockGetServerAuthSession.mockResolvedValue(null);
    await expect(
      AddArtistPage({ searchParams: Promise.resolve({ spotify: 'artist-id-123' }) })
    ).rejects.toThrow('NEXT_REDIRECT');
    expect(mockRedirect).toHaveBeenCalledWith('/');
  });

  it('shows "No Spotify ID provided" when no spotify param', async () => {
    mockGetServerAuthSession.mockResolvedValue({ user: { id: 'user-1' }, expires: '2099-01-01' });
    const jsx = await AddArtistPage({ searchParams: Promise.resolve({}) });
    render(jsx);
    expect(screen.getByText('No Spotify ID provided')).toBeInTheDocument();
  });

  it('renders AddArtistContent when authenticated with a spotify param', async () => {
    mockGetServerAuthSession.mockResolvedValue({ user: { id: 'user-1' }, expires: '2099-01-01' });
    mockGetSpotifyArtist.mockResolvedValue({ data: { id: 'spotify-abc', name: 'Test Artist' }, error: null });
    const jsx = await AddArtistPage({ searchParams: Promise.resolve({ spotify: 'spotify-abc' }) });
    render(jsx);
    expect(screen.getByTestId('add-artist-content')).toBeInTheDocument();
  });

  it('shows an error message when the Spotify artist fetch fails', async () => {
    mockGetServerAuthSession.mockResolvedValue({ user: { id: 'user-1' }, expires: '2099-01-01' });
    mockGetSpotifyArtist.mockResolvedValue({ data: null, error: 'Artist not found' });
    const jsx = await AddArtistPage({ searchParams: Promise.resolve({ spotify: 'bad-id' }) });
    render(jsx);
    expect(screen.getByText('Artist not found')).toBeInTheDocument();
  });

  it('fetches the Spotify artist with the provided spotify ID', async () => {
    mockGetServerAuthSession.mockResolvedValue({ user: { id: 'user-1' }, expires: '2099-01-01' });
    mockGetSpotifyArtist.mockResolvedValue({ data: { id: 'spotify-xyz', name: 'Another Artist' }, error: null });
    await AddArtistPage({ searchParams: Promise.resolve({ spotify: 'spotify-xyz' }) });
    expect(mockGetSpotifyArtist).toHaveBeenCalledWith('spotify-xyz', expect.anything());
  });
});
