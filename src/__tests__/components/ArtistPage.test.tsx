// @ts-nocheck
import React from 'react';
import { render, screen } from '@testing-library/react';

// ── Server dependency mocks ──────────────────────────────────────────────────
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

const mockGetSpotifyHeaders = jest.fn();
const mockGetSpotifyImage = jest.fn();
const mockGetNumberOfSpotifyReleases = jest.fn();
jest.mock('@/server/utils/queries/externalApiQueries', () => ({
  getSpotifyHeaders: (...args) => mockGetSpotifyHeaders(...args),
  getSpotifyImage: (...args) => mockGetSpotifyImage(...args),
  getNumberOfSpotifyReleases: (...args) => mockGetNumberOfSpotifyReleases(...args),
}));

const mockGetArtistDetailsText = jest.fn();
jest.mock('@/server/utils/services', () => ({
  getArtistDetailsText: (...args) => mockGetArtistDetailsText(...args),
}));

const mockNotFound = jest.fn(() => { throw new Error('NEXT_NOT_FOUND'); });
jest.mock('next/navigation', () => ({
  notFound: () => mockNotFound(),
  redirect: jest.fn(),
  usePathname: jest.fn(() => '/artist/test-id'),
  useSearchParams: jest.fn(() => ({ get: jest.fn(() => null) })),
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}));

// ── Child component mocks ────────────────────────────────────────────────────
jest.mock('@radix-ui/react-aspect-ratio', () => ({
  AspectRatio: function MockAspectRatio({ children }) { return <div data-testid="aspect-ratio">{children}</div>; },
}));
jest.mock('@/app/_components/ArtistLinks', () => function MockArtistLinks() { return <div data-testid="artist-links" />; });
jest.mock('@/app/_components/BookmarkButton', () => function MockBookmarkButton() { return <div data-testid="bookmark-button" />; });
jest.mock('@/app/_components/EditModeContext', () => ({
  EditModeProvider: function MockEditModeProvider({ children }) { return <>{children}</>; },
}));
jest.mock('@/app/_components/EditModeToggle', () => function MockEditModeToggle() { return <div data-testid="edit-mode-toggle" />; });
jest.mock('@/app/_components/AutoRefresh', () => function MockAutoRefresh() { return <div data-testid="auto-refresh" />; });
jest.mock('@/app/artist/[id]/_components/BlurbSection', () => function MockBlurbSection() { return <div data-testid="blurb-section" />; });
jest.mock('@/app/artist/[id]/_components/AddArtistData', () => function MockAddArtistData() { return <div data-testid="add-artist-data" />; });
jest.mock('@/app/artist/[id]/_components/FunFactsMobile', () => function MockFunFactsMobile() { return <div data-testid="fun-facts-mobile" />; });
jest.mock('@/app/artist/[id]/_components/FunFactsDesktop', () => function MockFunFactsDesktop() { return <div data-testid="fun-facts-desktop" />; });
jest.mock('@/app/artist/[id]/_components/GrapevineIframe', () => function MockGrapevineIframe() { return <div data-testid="grapevine-iframe" />; });
jest.mock('@/app/artist/[id]/_components/SeoArtistLinks', () => function MockSeoArtistLinks() { return <div data-testid="seo-artist-links" />; });

// ── Import after mocks ───────────────────────────────────────────────────────
import ArtistProfile, { generateMetadata } from '@/app/artist/[id]/page';

// ── Fixtures ─────────────────────────────────────────────────────────────────
const mockArtist = {
  id: 'artist-123',
  name: 'Test Artist',
  spotify: 'spotify-id-abc',
  bio: 'A great artist.',
  bandcamp: null,
  youtube: null,
  instagram: null,
};

const mockSession = {
  user: { id: 'user-uuid', email: 'test@example.com', isAdmin: false },
  expires: '2099-01-01',
};

const mockSpotifyImg = { artistImage: 'https://i.scdn.co/image/artist.jpg' };
const mockHeaders = { Authorization: 'Bearer test-token' };
const mockUrlMapList = [];

function makeProps(id = 'artist-123') {
  return { params: Promise.resolve({ id }) };
}

// ── generateMetadata ─────────────────────────────────────────────────────────
describe('generateMetadata', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSpotifyHeaders.mockResolvedValue(mockHeaders);
    mockGetSpotifyImage.mockResolvedValue(mockSpotifyImg);
  });

  it('returns "not found" metadata when artist does not exist', async () => {
    mockGetArtistById.mockResolvedValue(null);

    const meta = await generateMetadata(makeProps('bad-id'));

    expect(meta.title).toBe('Artist Not Found | Music Nerd');
    expect(meta.description).toMatch(/could not be found/i);
  });

  it('returns artist title and description when artist exists', async () => {
    mockGetArtistById.mockResolvedValue(mockArtist);

    const meta = await generateMetadata(makeProps());

    expect(meta.title).toBe('Test Artist | Music Nerd');
    expect(meta.description).toContain('Test Artist');
  });

  it('includes artist page URL in openGraph', async () => {
    mockGetArtistById.mockResolvedValue(mockArtist);

    const meta = await generateMetadata(makeProps());

    expect(meta.openGraph?.url).toContain('artist-123');
    expect(meta.openGraph?.type).toBe('profile');
  });

  it('uses Spotify image in openGraph when available', async () => {
    mockGetArtistById.mockResolvedValue(mockArtist);

    const meta = await generateMetadata(makeProps());
    const images = meta.openGraph?.images as { url: string }[];

    expect(images[0].url).toBe('https://i.scdn.co/image/artist.jpg');
  });

  it('falls back to default image when Spotify image is missing', async () => {
    mockGetArtistById.mockResolvedValue(mockArtist);
    mockGetSpotifyImage.mockResolvedValue({ artistImage: null });

    const meta = await generateMetadata(makeProps());
    const images = meta.openGraph?.images as { url: string }[];

    expect(images[0].url).toContain('default_pfp_pink.png');
  });

  it('sets twitter card metadata', async () => {
    mockGetArtistById.mockResolvedValue(mockArtist);

    const meta = await generateMetadata(makeProps());

    expect(meta.twitter?.card).toBe('summary_large_image');
    expect(meta.twitter?.title).toContain('Test Artist');
  });
});

// ── ArtistProfile – unauthenticated ──────────────────────────────────────────
describe('ArtistProfile (unauthenticated)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerAuthSession.mockResolvedValue(null);
    mockGetArtistById.mockResolvedValue(mockArtist);
    mockGetSpotifyHeaders.mockResolvedValue(mockHeaders);
    mockGetSpotifyImage.mockResolvedValue(mockSpotifyImg);
    mockGetNumberOfSpotifyReleases.mockResolvedValue(3);
    mockGetAllLinks.mockResolvedValue(mockUrlMapList);
    mockGetArtistDetailsText.mockReturnValue('3 releases');
  });

  it('calls notFound() when artist does not exist', async () => {
    mockGetArtistById.mockResolvedValue(null);

    await expect(ArtistProfile(makeProps('nonexistent'))).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockNotFound).toHaveBeenCalledTimes(1);
  });

  it('renders the artist name', async () => {
    const jsx = await ArtistProfile(makeProps());
    render(jsx);

    expect(screen.getByText('Test Artist')).toBeInTheDocument();
  });

  it('renders artist detail text from services', async () => {
    const jsx = await ArtistProfile(makeProps());
    render(jsx);

    expect(screen.getByText('3 releases')).toBeInTheDocument();
    expect(mockGetArtistDetailsText).toHaveBeenCalledWith(mockArtist, 3);
  });

  it('renders the artist image', async () => {
    const jsx = await ArtistProfile(makeProps());
    render(jsx);

    const img = screen.getByAltText('Artist Image') as HTMLImageElement;
    expect(img.src).toBe('https://i.scdn.co/image/artist.jpg');
  });

  it('falls back to default profile image when Spotify image is missing', async () => {
    mockGetSpotifyImage.mockResolvedValue({ artistImage: null });

    const jsx = await ArtistProfile(makeProps());
    render(jsx);

    const img = screen.getByAltText('Artist Image') as HTMLImageElement;
    expect(img.src).toContain('default_pfp_pink.png');
  });

  it('does NOT show BookmarkButton when unauthenticated', async () => {
    const jsx = await ArtistProfile(makeProps());
    render(jsx);

    expect(screen.queryByTestId('bookmark-button')).not.toBeInTheDocument();
  });

  it('does NOT show EditModeToggle when unauthenticated', async () => {
    const jsx = await ArtistProfile(makeProps());
    render(jsx);

    expect(screen.queryByTestId('edit-mode-toggle')).not.toBeInTheDocument();
  });

  it('renders core layout components regardless of auth state', async () => {
    const jsx = await ArtistProfile(makeProps());
    render(jsx);

    expect(screen.getByTestId('auto-refresh')).toBeInTheDocument();
    expect(screen.getByTestId('blurb-section')).toBeInTheDocument();
    expect(screen.getByTestId('fun-facts-desktop')).toBeInTheDocument();
    expect(screen.getByTestId('fun-facts-mobile')).toBeInTheDocument();
    expect(screen.getByTestId('seo-artist-links')).toBeInTheDocument();
  });

  it('renders Social Media Links and Support the Artist sections', async () => {
    const jsx = await ArtistProfile(makeProps());
    render(jsx);

    expect(screen.getByText('Social Media Links')).toBeInTheDocument();
    expect(screen.getByText('Support the Artist')).toBeInTheDocument();
  });

  it('renders Grapevine sections', async () => {
    const jsx = await ArtistProfile(makeProps());
    render(jsx);

    expect(screen.getAllByText('Grapevine').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('grapevine-iframe').length).toBeGreaterThan(0);
  });
});

// ── ArtistProfile – authenticated ────────────────────────────────────────────
describe('ArtistProfile (authenticated)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerAuthSession.mockResolvedValue(mockSession);
    mockGetArtistById.mockResolvedValue(mockArtist);
    mockGetSpotifyHeaders.mockResolvedValue(mockHeaders);
    mockGetSpotifyImage.mockResolvedValue(mockSpotifyImg);
    mockGetNumberOfSpotifyReleases.mockResolvedValue(5);
    mockGetAllLinks.mockResolvedValue(mockUrlMapList);
    mockGetArtistDetailsText.mockReturnValue('5 releases');
  });

  it('shows BookmarkButton when authenticated', async () => {
    const jsx = await ArtistProfile(makeProps());
    render(jsx);

    expect(screen.getByTestId('bookmark-button')).toBeInTheDocument();
  });

  it('shows EditModeToggle when authenticated', async () => {
    const jsx = await ArtistProfile(makeProps());
    render(jsx);

    expect(screen.getByTestId('edit-mode-toggle')).toBeInTheDocument();
  });

  it('fetches artist details with the correct ID', async () => {
    await ArtistProfile(makeProps('artist-456'));

    expect(mockGetArtistById).toHaveBeenCalledWith('artist-456');
  });

  it('fetches Spotify data for the artist', async () => {
    await ArtistProfile(makeProps());

    expect(mockGetSpotifyImage).toHaveBeenCalledWith(
      mockArtist.spotify,
      undefined,
      mockHeaders
    );
    expect(mockGetNumberOfSpotifyReleases).toHaveBeenCalledWith(
      mockArtist.spotify,
      mockHeaders
    );
  });
});
