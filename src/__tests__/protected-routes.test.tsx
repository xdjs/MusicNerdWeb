// @ts-nocheck
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/server/auth', () => ({
    getServerAuthSession: jest.fn(),
}));

jest.mock('@/server/utils/queries/externalApiQueries', () => ({
    getSpotifyHeaders: jest.fn(),
    getSpotifyArtist: jest.fn(),
    getSpotifyImage: jest.fn(),
    getNumberOfSpotifyReleases: jest.fn(),
}));

jest.mock('@/server/utils/queries/artistQueries', () => ({
    getArtistById: jest.fn(),
    getAllLinks: jest.fn(),
}));

jest.mock('@/server/utils/services', () => ({
    getArtistDetailsText: jest.fn(() => ''),
}));

const mockRedirect = jest.fn();
const mockNotFound = jest.fn(() => { throw new Error('NEXT_NOT_FOUND'); });
jest.mock('next/navigation', () => ({
    redirect: (url: string) => { mockRedirect(url); throw new Error(`NEXT_REDIRECT:${url}`); },
    notFound: () => mockNotFound(),
    usePathname: () => '/',
    useRouter: () => ({ push: jest.fn() }),
    useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@/app/add-artist/_components/AddArtistContent', () =>
    function MockAddArtistContent() {
        return <div data-testid="add-artist-content">Add Artist Form</div>;
    }
);

// Mocks for ArtistProfile child components
jest.mock('@/app/_components/ArtistLinks', () => () => <div data-testid="artist-links" />);
jest.mock('@/app/_components/BookmarkButton', () => () => <div data-testid="bookmark-button" />);
jest.mock('@/app/_components/EditModeContext', () => ({
    EditModeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('@/app/_components/EditModeToggle', () => () => <button data-testid="edit-toggle">Edit</button>);
jest.mock('@/app/_components/AutoRefresh', () => () => null);
jest.mock('@/app/artist/[id]/_components/BlurbSection', () => () => <div data-testid="blurb" />);
jest.mock('@/app/artist/[id]/_components/AddArtistData', () => () => <div data-testid="add-data" />);
jest.mock('@/app/artist/[id]/_components/FunFactsMobile', () => () => null);
jest.mock('@/app/artist/[id]/_components/FunFactsDesktop', () => () => null);
jest.mock('@/app/artist/[id]/_components/GrapevineIframe', () => () => null);
jest.mock('@/app/artist/[id]/_components/SeoArtistLinks', () => () => null);
jest.mock('@radix-ui/react-aspect-ratio', () => ({
    AspectRatio: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import AddArtistPage from '@/app/add-artist/page';
import ArtistProfile from '@/app/artist/[id]/page';
import { getServerAuthSession } from '@/server/auth';
import { getSpotifyHeaders, getSpotifyArtist, getSpotifyImage, getNumberOfSpotifyReleases } from '@/server/utils/queries/externalApiQueries';
import { getArtistById, getAllLinks } from '@/server/utils/queries/artistQueries';

const mockSession = {
    user: { id: 'user-uuid', email: 'test@test.com', isAdmin: false, isWhiteListed: true },
    expires: '2026-12-31',
};

const mockArtist = {
    id: 'artist-uuid',
    name: 'Test Artist',
    spotify: 'spotify123',
    bio: null,
    bandcamp: null,
};

describe('Protected routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('/add-artist (requires authentication)', () => {
        beforeEach(() => {
            (getSpotifyHeaders as jest.Mock).mockResolvedValue({ headers: { Authorization: 'Bearer token' } });
            (getSpotifyArtist as jest.Mock).mockResolvedValue({
                data: { name: 'New Artist', id: 'new-artist-id', images: [] },
                error: null,
            });
        });

        it('redirects unauthenticated users to "/"', async () => {
            (getServerAuthSession as jest.Mock).mockResolvedValue(null);
            await expect(
                AddArtistPage({ searchParams: Promise.resolve({ spotify: 'some-id' }) })
            ).rejects.toThrow('NEXT_REDIRECT:/');
            expect(mockRedirect).toHaveBeenCalledWith('/');
        });

        it('renders the form for authenticated users', async () => {
            (getServerAuthSession as jest.Mock).mockResolvedValue(mockSession);
            const jsx = await AddArtistPage({ searchParams: Promise.resolve({ spotify: 'some-id' }) });
            render(jsx as React.ReactElement);
            expect(screen.getByTestId('add-artist-content')).toBeInTheDocument();
        });

        it('does not redirect authenticated users', async () => {
            (getServerAuthSession as jest.Mock).mockResolvedValue(mockSession);
            await AddArtistPage({ searchParams: Promise.resolve({ spotify: 'some-id' }) });
            expect(mockRedirect).not.toHaveBeenCalled();
        });

        it('shows an error page (not a redirect) when spotify param is missing, even if authenticated', async () => {
            (getServerAuthSession as jest.Mock).mockResolvedValue(mockSession);
            const jsx = await AddArtistPage({ searchParams: Promise.resolve({}) });
            render(jsx as React.ReactElement);
            expect(screen.getByText('No Spotify ID provided')).toBeInTheDocument();
            expect(mockRedirect).not.toHaveBeenCalled();
        });
    });

    describe('/artist/[id] (publicly accessible)', () => {
        beforeEach(() => {
            (getArtistById as jest.Mock).mockResolvedValue(mockArtist);
            (getSpotifyHeaders as jest.Mock).mockResolvedValue({ headers: { Authorization: 'Bearer token' } });
            (getSpotifyImage as jest.Mock).mockResolvedValue({ artistImage: null });
            (getNumberOfSpotifyReleases as jest.Mock).mockResolvedValue(3);
            (getAllLinks as jest.Mock).mockResolvedValue([]);
        });

        it('is accessible without authentication', async () => {
            (getServerAuthSession as jest.Mock).mockResolvedValue(null);
            const jsx = await ArtistProfile({ params: Promise.resolve({ id: 'artist-uuid' }) });
            render(jsx as React.ReactElement);
            expect(screen.getByText('Test Artist')).toBeInTheDocument();
            expect(mockRedirect).not.toHaveBeenCalled();
        });

        it('shows edit controls only when authenticated', async () => {
            (getServerAuthSession as jest.Mock).mockResolvedValue(mockSession);
            const jsx = await ArtistProfile({ params: Promise.resolve({ id: 'artist-uuid' }) });
            render(jsx as React.ReactElement);
            expect(screen.getByTestId('edit-toggle')).toBeInTheDocument();
        });

        it('hides edit controls for unauthenticated visitors', async () => {
            (getServerAuthSession as jest.Mock).mockResolvedValue(null);
            const jsx = await ArtistProfile({ params: Promise.resolve({ id: 'artist-uuid' }) });
            render(jsx as React.ReactElement);
            expect(screen.queryByTestId('edit-toggle')).not.toBeInTheDocument();
        });

        it('returns 404 for nonexistent artist (unauthenticated)', async () => {
            (getServerAuthSession as jest.Mock).mockResolvedValue(null);
            (getArtistById as jest.Mock).mockResolvedValue(null);
            await expect(
                ArtistProfile({ params: Promise.resolve({ id: 'nonexistent' }) })
            ).rejects.toThrow('NEXT_NOT_FOUND');
        });

        it('returns 404 for nonexistent artist (authenticated)', async () => {
            (getServerAuthSession as jest.Mock).mockResolvedValue(mockSession);
            (getArtistById as jest.Mock).mockResolvedValue(null);
            await expect(
                ArtistProfile({ params: Promise.resolve({ id: 'nonexistent' }) })
            ).rejects.toThrow('NEXT_NOT_FOUND');
        });
    });
});
