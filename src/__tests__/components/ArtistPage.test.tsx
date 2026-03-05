// @ts-nocheck
import React from 'react';
import { render, screen } from '@testing-library/react';

// ── Server dependency mocks ───────────────────────────────────────────────────
const mockGetServerAuthSession = jest.fn();
jest.mock('@/server/auth', () => ({
  getServerAuthSession: (...args) => mockGetServerAuthSession(...args),
}));

const mockGetArtistById = jest.fn();
const mockGetAllLinks = jest.fn();
jest.mock('@/server/utils/queries/artistQueries', () => ({
  getArtistById: (...args) => mockGetArtistById(...args),
  getAllLinks: (...args) => mockGetAllLinks(...args),
}));

const mockGetSpotifyImage = jest.fn();
const mockGetSpotifyHeaders = jest.fn();
const mockGetNumberOfSpotifyReleases = jest.fn();
jest.mock('@/server/utils/queries/externalApiQueries', () => ({
  getSpotifyImage: (...args) => mockGetSpotifyImage(...args),
  getSpotifyHeaders: (...args) => mockGetSpotifyHeaders(...args),
  getNumberOfSpotifyReleases: (...args) => mockGetNumberOfSpotifyReleases(...args),
}));

jest.mock('@/server/utils/services', () => ({
  getArtistDetailsText: jest.fn(() => 'Artist details text'),
}));

// ── Navigation mock ───────────────────────────────────────────────────────────
const mockNotFound = jest.fn(() => { throw new Error('NEXT_NOT_FOUND'); });
jest.mock('next/navigation', () => ({
  notFound: () => mockNotFound(),
  useRouter: jest.fn(() => ({ push: jest.fn() })),
  usePathname: jest.fn(() => '/artist/artist-123'),
}));

// ── Child component mocks (named functions for display-name) ──────────────────
jest.mock('@/app/_components/ArtistLinks', () =>
  function MockArtistLinks() { return <div data-testid="artist-links" />; }
);
jest.mock('@/app/_components/BookmarkButton', () =>
  function MockBookmarkButton() { return <div data-testid="bookmark-button" />; }
);
jest.mock('@/app/_components/EditModeContext', () => ({
  EditModeProvider: function MockEditModeProvider({ children }) { return <>{children}</>; },
}));
jest.mock('@/app/_components/EditModeToggle', () =>
  function MockEditModeToggle() { return <div data-testid="edit-mode-toggle" />; }
);
jest.mock('@/app/_components/AutoRefresh', () =>
  function MockAutoRefresh() { return null; }
);
jest.mock('@/app/artist/[id]/_components/BlurbSection', () =>
  function MockBlurbSection() { return <div data-testid="blurb-section" />; }
);
jest.mock('@/app/artist/[id]/_components/AddArtistData', () =>
  function MockAddArtistData() { return <div data-testid="add-artist-data" />; }
);
jest.mock('@/app/artist/[id]/_components/FunFactsMobile', () =>
  function MockFunFactsMobile() { return <div data-testid="fun-facts-mobile" />; }
);
jest.mock('@/app/artist/[id]/_components/FunFactsDesktop', () =>
  function MockFunFactsDesktop() { return <div data-testid="fun-facts-desktop" />; }
);
jest.mock('@/app/artist/[id]/_components/GrapevineIframe', () =>
  function MockGrapevineIframe() { return <div data-testid="grapevine-iframe" />; }
);
jest.mock('@/app/artist/[id]/_components/SeoArtistLinks', () =>
  function MockSeoArtistLinks() { return null; }
);
jest.mock('@radix-ui/react-aspect-ratio', () => ({
  AspectRatio: function MockAspectRatio({ children }) { return <div>{children}</div>; },
}));

// ── Import after mocks ────────────────────────────────────────────────────────
import ArtistProfile, { generateMetadata } from '@/app/artist/[id]/page';

// ── Fixtures ──────────────────────────────────────────────────────────────────
const mockArtist = {
  id: 'artist-123',
  name: 'Test Artist',
  spotify: 'spotify-id-abc',
  bio: 'A test artist bio',
};
const mockSpotifyImg = { artistImage: 'https://example.com/artist.jpg' };

function makeProps(id = 'artist-123') {
  return { params: Promise.resolve({ id }) };
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('ArtistProfile page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerAuthSession.mockResolvedValue(null);
    mockGetArtistById.mockResolvedValue(mockArtist);
    mockGetSpotifyHeaders.mockResolvedValue({ Authorization: 'Bearer test' });
    mockGetSpotifyImage.mockResolvedValue(mockSpotifyImg);
    mockGetNumberOfSpotifyReleases.mockResolvedValue(5);
    mockGetAllLinks.mockResolvedValue([]);
  });

  it('renders the artist name', async () => {
    const jsx = await ArtistProfile(makeProps());
    render(jsx);
    expect(screen.getByText('Test Artist')).toBeInTheDocument();
  });

  it('renders the artist image', async () => {
    const jsx = await ArtistProfile(makeProps());
    render(jsx);
    expect(screen.getByAltText('Artist Image')).toBeInTheDocument();
  });

  it('renders ArtistLinks components', async () => {
    const jsx = await ArtistProfile(makeProps());
    render(jsx);
    expect(screen.getAllByTestId('artist-links').length).toBeGreaterThan(0);
  });

  it('renders BlurbSection', async () => {
    const jsx = await ArtistProfile(makeProps());
    render(jsx);
    expect(screen.getByTestId('blurb-section')).toBeInTheDocument();
  });

  it('calls notFound() when artist does not exist', async () => {
    mockGetArtistById.mockResolvedValue(null);
    await expect(ArtistProfile(makeProps('nonexistent'))).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockNotFound).toHaveBeenCalled();
  });

  it('shows BookmarkButton when user is authenticated', async () => {
    mockGetServerAuthSession.mockResolvedValue({
      user: { id: 'user-1' },
      expires: '2099-01-01',
    });
    const jsx = await ArtistProfile(makeProps());
    render(jsx);
    expect(screen.getByTestId('bookmark-button')).toBeInTheDocument();
  });

  it('does NOT show BookmarkButton when user is not authenticated', async () => {
    mockGetServerAuthSession.mockResolvedValue(null);
    const jsx = await ArtistProfile(makeProps());
    render(jsx);
    expect(screen.queryByTestId('bookmark-button')).not.toBeInTheDocument();
  });

  it('uses the fallback image when Spotify image is unavailable', async () => {
    mockGetSpotifyImage.mockResolvedValue({ artistImage: null });
    const jsx = await ArtistProfile(makeProps());
    render(jsx);
    const img = screen.getByAltText('Artist Image');
    expect(img).toHaveAttribute('src', '/default_pfp_pink.png');
  });
});

describe('generateMetadata', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetArtistById.mockResolvedValue(mockArtist);
    mockGetSpotifyHeaders.mockResolvedValue({ Authorization: 'Bearer test' });
    mockGetSpotifyImage.mockResolvedValue(mockSpotifyImg);
  });

  it('returns correct title when artist exists', async () => {
    const metadata = await generateMetadata(makeProps());
    expect(metadata.title).toBe('Test Artist | Music Nerd');
  });

  it('returns "Artist Not Found" title when artist does not exist', async () => {
    mockGetArtistById.mockResolvedValue(null);
    const metadata = await generateMetadata(makeProps('nonexistent'));
    expect(metadata.title).toBe('Artist Not Found | Music Nerd');
  });

  it('returns openGraph metadata with artist name', async () => {
    const metadata = await generateMetadata(makeProps());
    expect(metadata.openGraph?.title).toBe('Test Artist | Music Nerd');
  });

  it('uses fallback image URL in openGraph when Spotify image unavailable', async () => {
    mockGetSpotifyImage.mockResolvedValue({ artistImage: null });
    const metadata = await generateMetadata(makeProps());
    expect(metadata.openGraph?.images?.[0]?.url).toBe(
      'https://www.musicnerd.xyz/default_pfp_pink.png'
    );
  });
});
