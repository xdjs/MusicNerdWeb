jest.mock('@/server/utils/artistLinkReview/getHiddenLinkSourceIds',()=>({getHiddenLinkSourceIds:jest.fn().mockResolvedValue([])}));
// @ts-nocheck
jest.mock('@/server/utils/bio/getPublicArtistAbout', () => ({ getPublicArtistAbout: jest.fn().mockResolvedValue(null) }));

import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/server/utils/queries/externalApiQueries', () => ({
    getSpotifyHeaders: jest.fn(),
    getSpotifyArtist: jest.fn(),
    getSpotifyImage: jest.fn(),
    getNumberOfSpotifyReleases: jest.fn(),
}));

jest.mock('@/server/utils/musicPlatform', () => ({
    musicPlatformData: {
        getArtist: jest.fn().mockResolvedValue(null),
        getArtistImage: jest.fn().mockResolvedValue(null),
        getArtistPortrait: jest.fn().mockResolvedValue(null),
    },
    deezerProvider: { getArtist: jest.fn() },
    spotifyProvider: { getArtist: jest.fn() },
}));

jest.mock('@/server/utils/queries/artistQueries', () => ({
    getArtistById: jest.fn(),
    getAllLinks: jest.fn(),
    getArtistLinks: jest.fn().mockResolvedValue([]),
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
jest.mock('@/app/_components/ArtistLinksGrid', () => function ArtistLinksGrid() { return <div data-testid="artist-links" />; });
jest.mock('@/app/_components/EditModeContext', () => ({
    EditModeProvider: function EditModeProvider({ children }: { children: React.ReactNode }) { return <>{children}</>; },
    // A real context, not a stub: KnowledgeSection and VaultSection both call
    // useContext on it, and useContext(undefined) throws on $$typeof. Default is
    // a visitor — not editing — so the owner-only sections render nothing here.
    EditModeContext: require('react').createContext({ canEdit: false, isEditing: false, setIsEditing: () => {} }),
}));
jest.mock('@/app/_components/EditModeToggle', () => function EditModeToggle() { return <button data-testid="edit-toggle">Edit</button>; });
jest.mock('@/app/_components/AutoRefresh', () => function AutoRefresh() { return null; });
jest.mock('@/app/artist/[id]/_components/BlurbSection', () => function BlurbSection() { return <div data-testid="blurb" />; });
jest.mock('@/app/artist/[id]/_components/AddArtistData', () => function AddArtistData() { return <div data-testid="add-data" />; });
jest.mock('@/app/artist/[id]/_components/HeroSection', () => function HeroSection({ artistName, children }: any) { return <div data-testid="hero-section"><h1>{artistName}</h1>{children}</div>; });
jest.mock('@/app/artist/[id]/_components/GrapevineIframe', () => function GrapevineIframe() { return null; });
jest.mock('@/app/artist/[id]/_components/SeoArtistLinks', () => function SeoArtistLinks() { return null; });
// Same reason as SeoArtistLinks: an async server component that reads the link
// table, which this suite does not stand up.
jest.mock('@/app/artist/[id]/_components/ArtistJsonLd', () => function ArtistJsonLd() { return null; });
jest.mock('@/app/artist/[id]/_components/ClaimButton', () => function ClaimButton() { return null; });
jest.mock('@/app/artist/[id]/_components/LatestSection', () => function LatestSection() { return <section id="mn-latest">Latest</section>; });
jest.mock('@/app/artist/[id]/_components/VaultSection', () => function VaultSection() { return <div data-testid="vault-section" />; });
jest.mock('@/app/artist/[id]/_components/AskAboutArtist', () => function AskAboutArtist() { return null; });
// Who is looking is read on the client from MusicNerdAPI; a visitor unless a test says otherwise.
jest.mock('@/hooks/useArtistViewer', () => ({ useArtistViewer: jest.fn(() => ({ user: null, claimStatus: null, addedByCaller: false })) }));
jest.mock('@/hooks/useArtistEditor', () => ({ useArtistEditor: jest.fn(() => null) }));
jest.mock('@/hooks/useClaimantOnboarding', () => ({ useClaimantOnboarding: jest.fn(() => null) }));
jest.mock('@/server/utils/queries/dashboardQueries', () => ({
    getClaimByArtistId: jest.fn().mockResolvedValue(null),
    getVaultSourcesByArtistId: jest.fn().mockResolvedValue([]),
}));

import AddArtistPage from '@/app/add-artist/page';
import ArtistProfile from '@/app/artist/[id]/page';
import { getArtistById, getAllLinks } from '@/server/utils/queries/artistQueries';
import { spotifyProvider, musicPlatformData } from '@/server/utils/musicPlatform';
import { useArtistViewer } from '@/hooks/useArtistViewer';
import { mockMusicNerdUser } from '@/test/__mocks__/useMusicNerdUser';

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

    describe('/add-artist (sign-in is asked for on Add, in the browser)', () => {
        beforeEach(() => {
            (spotifyProvider.getArtist as jest.Mock).mockResolvedValue({
                platform: 'spotify', platformId: 'some-id', name: 'New Artist',
                imageUrl: null, followerCount: 0, albumCount: 0, genres: [],
                profileUrl: '', topTrackName: null,
            });
        });

        it('renders the form on the server without an account', async () => {
            const jsx = await AddArtistPage({ searchParams: Promise.resolve({ spotify: 'some-id' }) });
            render(jsx as React.ReactElement);
            expect(screen.getByTestId('add-artist-content')).toBeInTheDocument();
            expect(mockRedirect).not.toHaveBeenCalled();
        });

        it('shows an error page (not a redirect) when no platform param is present', async () => {
            const jsx = await AddArtistPage({ searchParams: Promise.resolve({}) });
            render(jsx as React.ReactElement);
            expect(screen.getByText('No artist ID provided')).toBeInTheDocument();
            expect(mockRedirect).not.toHaveBeenCalled();
        });
    });

    describe('/artist/[id] (publicly accessible)', () => {
        beforeEach(() => {
            (getArtistById as jest.Mock).mockResolvedValue(mockArtist);
            (musicPlatformData.getArtist as jest.Mock).mockResolvedValue({
                platform: 'spotify', platformId: 'spotify123', name: 'Test Artist',
                imageUrl: null, followerCount: 0, albumCount: 3, genres: [],
                profileUrl: '', topTrackName: null,
            });
            (musicPlatformData.getArtistImage as jest.Mock).mockResolvedValue(null);
            (getAllLinks as jest.Mock).mockResolvedValue([]);
        });

        it('is accessible without authentication', async () => {
            const jsx = await ArtistProfile({ params: Promise.resolve({ id: 'artist-uuid' }) });
            render(jsx as React.ReactElement);
            expect(screen.getByText('Test Artist')).toBeInTheDocument();
            expect(mockRedirect).not.toHaveBeenCalled();
        });

        it('shows edit controls only when admin', async () => {
            jest.mocked(useArtistViewer).mockReturnValue({ user: { ...mockMusicNerdUser, isAdmin: true }, claimStatus: null, addedByCaller: false });
            const jsx = await ArtistProfile({ params: Promise.resolve({ id: 'artist-uuid' }) });
            render(jsx as React.ReactElement);
            expect(screen.getByTestId('edit-toggle')).toBeInTheDocument();
        });

        it('hides edit controls for unauthenticated visitors', async () => {
            jest.mocked(useArtistViewer).mockReturnValue({ user: null, claimStatus: null, addedByCaller: false });
            const jsx = await ArtistProfile({ params: Promise.resolve({ id: 'artist-uuid' }) });
            render(jsx as React.ReactElement);
            expect(screen.queryByTestId('edit-toggle')).not.toBeInTheDocument();
        });

        it('returns 404 for nonexistent artist', async () => {
            (getArtistById as jest.Mock).mockResolvedValue(null);
            await expect(
                ArtistProfile({ params: Promise.resolve({ id: 'nonexistent' }) })
            ).rejects.toThrow('NEXT_NOT_FOUND');
        });
    });
});
