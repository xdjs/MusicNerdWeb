// @ts-nocheck
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }),
    usePathname: () => '/artist/123',
    useSearchParams: () => new URLSearchParams(),
}));

jest.mock('next-auth/react', () => ({
    useSession: () => ({ data: null }),
}));

jest.mock('@privy-io/react-auth', () => ({
    useLogin: () => ({ login: jest.fn() }),
}));

const mockAddArtist = jest.fn();
jest.mock('@/app/actions/addArtist', () => ({
    addArtist: (...args: unknown[]) => mockAddArtist(...args),
}));

jest.mock('use-debounce', () => ({
    useDebounce: (val: string) => [val],
}));

jest.mock('@/hooks/use-toast', () => ({
    useToast: () => ({ toast: jest.fn() }),
}));

import SearchBar from '@/app/_components/nav/components/SearchBar';

function makeDbResult(id: string, name: string) {
    return { id, name, spotify: `spot-${id}`, isSpotifyOnly: false };
}

function mockSearchResults(results: object[]) {
    global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ results }),
    });
}

describe('Navigation history behavior', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('navigates to artist page via router.push when a DB result is clicked', async () => {
        mockSearchResults([makeDbResult('42', 'Radiohead')]);
        render(<SearchBar />);

        const input = screen.getByPlaceholderText('Search for an artist...');
        fireEvent.change(input, { target: { value: 'radio' } });
        fireEvent.focus(input);

        await waitFor(() => {
            expect(screen.getByText('Radiohead')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Radiohead'));
        expect(mockPush).toHaveBeenCalledWith('/artist/42');
    });

    it('different results push different URLs', async () => {
        mockSearchResults([makeDbResult('1', 'Artist One'), makeDbResult('2', 'Artist Two')]);
        render(<SearchBar />);

        const input = screen.getByPlaceholderText('Search for an artist...');
        fireEvent.change(input, { target: { value: 'artist' } });
        fireEvent.focus(input);

        await waitFor(() => {
            expect(screen.getByText('Artist One')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Artist One'));
        expect(mockPush).toHaveBeenLastCalledWith('/artist/1');
    });

    it('clears search input after navigating to an artist', async () => {
        mockSearchResults([makeDbResult('42', 'Radiohead')]);
        render(<SearchBar />);

        const input = screen.getByPlaceholderText('Search for an artist...');
        fireEvent.change(input, { target: { value: 'radio' } });
        fireEvent.focus(input);

        await waitFor(() => {
            expect(screen.getByText('Radiohead')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Radiohead'));

        await waitFor(() => {
            expect(input).toHaveValue('');
        });
    });

    it('closes the dropdown after navigating', async () => {
        mockSearchResults([makeDbResult('42', 'Radiohead')]);
        render(<SearchBar />);

        const input = screen.getByPlaceholderText('Search for an artist...');
        fireEvent.change(input, { target: { value: 'radio' } });
        fireEvent.focus(input);

        await waitFor(() => {
            expect(screen.getByText('Radiohead')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Radiohead'));

        await waitFor(() => {
            expect(screen.queryByText('Radiohead')).not.toBeInTheDocument();
        });
    });

    it('does not navigate when search query is empty', async () => {
        mockSearchResults([]);
        render(<SearchBar />);

        const input = screen.getByPlaceholderText('Search for an artist...');
        fireEvent.focus(input);

        await waitFor(() => {
            expect(global.fetch).not.toHaveBeenCalled();
        });

        expect(mockPush).not.toHaveBeenCalled();
    });
});
