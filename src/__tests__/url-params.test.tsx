// @ts-nocheck
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/server/auth', () => ({
    getServerAuthSession: jest.fn(),
}));

jest.mock('@/server/utils/queries/externalApiQueries', () => ({
    getSpotifyHeaders: jest.fn(),
    getSpotifyArtist: jest.fn(),
}));

const mockRedirect = jest.fn();
jest.mock('next/navigation', () => ({
    redirect: (url: string) => { mockRedirect(url); throw new Error(`NEXT_REDIRECT:${url}`); },
    notFound: jest.fn(() => { throw new Error('NEXT_NOT_FOUND'); }),
    usePathname: () => '/add-artist',
    useRouter: () => ({ push: jest.fn() }),
    useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@/app/add-artist/_components/AddArtistContent', () =>
    function MockAddArtistContent({ initialArtist }: { initialArtist: any }) {
        return <div data-testid="add-artist-content">{initialArtist.name}</div>;
    }
);

import AddArtistPage from '@/app/add-artist/page';
import { getServerAuthSession } from '@/server/auth';
import { getSpotifyHeaders, getSpotifyArtist } from '@/server/utils/queries/externalApiQueries';

const mockSession = {
    user: { id: 'user-uuid', email: 'test@test.com' },
    expires: '2026-12-31',
};

describe('AddArtistPage URL parameter handling', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (getServerAuthSession as jest.Mock).mockResolvedValue(mockSession);
        (getSpotifyHeaders as jest.Mock).mockResolvedValue({ headers: { Authorization: 'Bearer token' } });
        (getSpotifyArtist as jest.Mock).mockResolvedValue({
            data: { name: 'Taylor Swift', id: 'ts-id', images: [] },
            error: null,
        });
    });

    it('renders AddArtistContent when spotify param is present', async () => {
        const jsx = await AddArtistPage({ searchParams: Promise.resolve({ spotify: 'ts-id' }) });
        render(jsx as React.ReactElement);
        expect(screen.getByTestId('add-artist-content')).toBeInTheDocument();
        expect(screen.getByText('Taylor Swift')).toBeInTheDocument();
    });

    it('calls getSpotifyArtist with the correct ID from the URL param', async () => {
        await AddArtistPage({ searchParams: Promise.resolve({ spotify: 'ts-id' }) });
        expect(getSpotifyArtist).toHaveBeenCalledWith('ts-id', expect.anything());
    });

    it('shows "No Spotify ID provided" when spotify param is missing', async () => {
        const jsx = await AddArtistPage({ searchParams: Promise.resolve({}) });
        render(jsx as React.ReactElement);
        expect(screen.getByText('No Spotify ID provided')).toBeInTheDocument();
    });

    it('shows "No Spotify ID provided" when spotify param is undefined', async () => {
        const jsx = await AddArtistPage({ searchParams: Promise.resolve({ spotify: undefined }) });
        render(jsx as React.ReactElement);
        expect(screen.getByText('No Spotify ID provided')).toBeInTheDocument();
    });

    it('does not call getSpotifyArtist when spotify param is absent', async () => {
        await AddArtistPage({ searchParams: Promise.resolve({}) });
        expect(getSpotifyArtist).not.toHaveBeenCalled();
    });

    it('shows error from Spotify API', async () => {
        (getSpotifyArtist as jest.Mock).mockResolvedValue({ data: null, error: 'Artist not found on Spotify' });
        const jsx = await AddArtistPage({ searchParams: Promise.resolve({ spotify: 'bad-id' }) });
        render(jsx as React.ReactElement);
        expect(screen.getByText('Artist not found on Spotify')).toBeInTheDocument();
    });

    it('shows fallback error when Spotify returns no data and no error message', async () => {
        (getSpotifyArtist as jest.Mock).mockResolvedValue({ data: null, error: null });
        const jsx = await AddArtistPage({ searchParams: Promise.resolve({ spotify: 'bad-id' }) });
        render(jsx as React.ReactElement);
        expect(screen.getByText('Failed to fetch artist data')).toBeInTheDocument();
    });
});
