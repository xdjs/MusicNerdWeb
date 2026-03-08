// @ts-nocheck
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/server/auth', () => ({
    getServerAuthSession: jest.fn(),
}));

jest.mock('@/server/utils/queries/artistQueries', () => ({
    getArtistById: jest.fn(),
    getAllLinks: jest.fn(),
}));

jest.mock('@/server/utils/queries/externalApiQueries', () => ({
    getSpotifyImage: jest.fn(),
    getSpotifyHeaders: jest.fn(),
    getNumberOfSpotifyReleases: jest.fn(),
}));

jest.mock('@/server/utils/services', () => ({
    getArtistDetailsText: jest.fn(() => '1,000 monthly listeners'),
}));

const mockNotFound = jest.fn(() => { throw new Error('NEXT_NOT_FOUND'); });
jest.mock('next/navigation', () => ({
    notFound: () => mockNotFound(),
    redirect: jest.fn(),
    usePathname: () => '/artist/123',
    useRouter: () => ({ push: jest.fn() }),
    useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@/app/_components/ArtistLinks', () => function ArtistLinks() { return <div data-testid="artist-links" />; });
jest.mock('@/app/_components/BookmarkButton', () => function BookmarkButton() { return <div data-testid="bookmark-button" />; });
jest.mock('@/app/_components/EditModeContext', () => ({
    EditModeProvider: function EditModeProvider({ children }: { children: React.ReactNode }) { return <>{children}</>; },
}));
jest.mock('@/app/_components/EditModeToggle', () => function EditModeToggle() { return <button data-testid="edit-mode-toggle">Edit</button>; });
jest.mock('@/app/_components/AutoRefresh', () => function AutoRefresh() { return null; });
jest.mock('@/app/artist/[id]/_components/BlurbSection', () => function BlurbSection() { return <div data-testid="blurb-section" />; });
jest.mock('@/app/artist/[id]/_components/AddArtistData', () => function AddArtistData() { return <div data-testid="add-artist-data" />; });
jest.mock('@/app/artist/[id]/_components/FunFactsMobile', () => function FunFactsMobile() { return <div data-testid="fun-facts-mobile" />; });
jest.mock('@/app/artist/[id]/_components/FunFactsDesktop', () => function FunFactsDesktop() { return <div data-testid="fun-facts-desktop" />; });
jest.mock('@/app/artist/[id]/_components/GrapevineIframe', () => function GrapevineIframe() { return <div data-testid="grapevine-iframe" />; });
jest.mock('@/app/artist/[id]/_components/SeoArtistLinks', () => function SeoArtistLinks() { return null; });
jest.mock('@radix-ui/react-aspect-ratio', () => ({
    AspectRatio: function AspectRatio({ children }: { children: React.ReactNode }) { return <div>{children}</div>; },
}));

import ArtistProfile, { generateMetadata } from '@/app/artist/[id]/page';
import { getServerAuthSession } from '@/server/auth';
import { getArtistById, getAllLinks } from '@/server/utils/queries/artistQueries';
import { getSpotifyImage, getSpotifyHeaders, getNumberOfSpotifyReleases } from '@/server/utils/queries/externalApiQueries';

const mockArtist = {
    id: 'artist-uuid',
    name: 'Test Artist',
    spotify: 'spotify123',
    bio: 'A great artist.',
    bandcamp: null,
    instagram: null,
    twitter: null,
};

const mockSpotifyImg = { artistImage: 'https://img.spotify.com/artist.jpg' };
const mockHeaders = { headers: { Authorization: 'Bearer token' } };

function setupMocks({ session = null, artist = mockArtist, spotifyImg = mockSpotifyImg } = {}) {
    (getServerAuthSession as jest.Mock).mockResolvedValue(session);
    (getArtistById as jest.Mock).mockResolvedValue(artist);
    (getSpotifyHeaders as jest.Mock).mockResolvedValue(mockHeaders);
    (getSpotifyImage as jest.Mock).mockResolvedValue(spotifyImg);
    (getNumberOfSpotifyReleases as jest.Mock).mockResolvedValue(5);
    (getAllLinks as jest.Mock).mockResolvedValue([]);
}

async function renderArtistPage(id = 'artist-uuid') {
    const jsx = await ArtistProfile({ params: Promise.resolve({ id }) });
    return render(jsx as React.ReactElement);
}

describe('ArtistProfile page', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        setupMocks();
    });

    describe('Unauthenticated rendering', () => {
        it('renders artist name', async () => {
            await renderArtistPage();
            expect(screen.getByText('Test Artist')).toBeInTheDocument();
        });

        it('renders artist image with correct src', async () => {
            await renderArtistPage();
            const img = screen.getByAltText('Artist Image');
            expect(img).toHaveAttribute('src', 'https://img.spotify.com/artist.jpg');
        });

        it('falls back to default image when Spotify returns no image', async () => {
            setupMocks({ spotifyImg: { artistImage: null } });
            await renderArtistPage();
            const img = screen.getByAltText('Artist Image');
            expect(img).toHaveAttribute('src', '/default_pfp_pink.png');
        });

        it('renders artist links section', async () => {
            await renderArtistPage();
            expect(screen.getAllByTestId('artist-links').length).toBeGreaterThan(0);
        });

        it('renders the blurb section', async () => {
            await renderArtistPage();
            expect(screen.getByTestId('blurb-section')).toBeInTheDocument();
        });

        it('renders fun facts on both mobile and desktop', async () => {
            await renderArtistPage();
            expect(screen.getByTestId('fun-facts-desktop')).toBeInTheDocument();
            expect(screen.getByTestId('fun-facts-mobile')).toBeInTheDocument();
        });

        it('does not render bookmark button when not authenticated', async () => {
            await renderArtistPage();
            expect(screen.queryByTestId('bookmark-button')).not.toBeInTheDocument();
        });

        it('does not render edit mode toggle when not authenticated', async () => {
            await renderArtistPage();
            expect(screen.queryByTestId('edit-mode-toggle')).not.toBeInTheDocument();
        });
    });

    describe('Authenticated rendering', () => {
        const mockSession = {
            user: { id: 'user-uuid', email: 'test@test.com', isAdmin: false, isWhiteListed: true },
            expires: '2026-12-31',
        };

        beforeEach(() => {
            setupMocks({ session: mockSession });
        });

        it('renders bookmark button when authenticated', async () => {
            await renderArtistPage();
            expect(screen.getByTestId('bookmark-button')).toBeInTheDocument();
        });

        it('renders edit mode toggle when authenticated', async () => {
            await renderArtistPage();
            expect(screen.getByTestId('edit-mode-toggle')).toBeInTheDocument();
        });
    });

    describe('Missing artist', () => {
        it('calls notFound() when artist does not exist', async () => {
            (getArtistById as jest.Mock).mockResolvedValue(null);
            await expect(renderArtistPage('nonexistent-id')).rejects.toThrow('NEXT_NOT_FOUND');
            expect(mockNotFound).toHaveBeenCalled();
        });
    });

    describe('generateMetadata', () => {
        it('returns correct title and description for an existing artist', async () => {
            const metadata = await generateMetadata({ params: Promise.resolve({ id: 'artist-uuid' }) });
            expect(metadata.title).toBe('Test Artist | Music Nerd');
            expect(metadata.description).toContain('Test Artist');
        });

        it('returns not-found metadata when artist does not exist', async () => {
            (getArtistById as jest.Mock).mockResolvedValue(null);

            const metadata = await generateMetadata({ params: Promise.resolve({ id: 'nonexistent' }) });
            expect(metadata.title).toBe('Artist Not Found | Music Nerd');
        });

        it('includes OpenGraph image from Spotify', async () => {
            const metadata = await generateMetadata({ params: Promise.resolve({ id: 'artist-uuid' }) });
            expect(metadata.openGraph?.images?.[0]).toMatchObject({
                url: 'https://img.spotify.com/artist.jpg',
            });
        });
    });
});
