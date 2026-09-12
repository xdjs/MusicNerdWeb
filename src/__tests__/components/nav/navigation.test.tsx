// @ts-nocheck
import React from 'react';
import { render, screen, within } from '@testing-library/react';

let mockPathname = '/';

jest.mock('next/navigation', () => ({
    usePathname: () => mockPathname,
    useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
    useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@/app/_components/nav/components/SearchBar', () => function SearchBar() { return <div data-testid="search-bar" />; });
jest.mock('@/app/_components/nav/components/AddArtist', () => function AddArtist() { return <button data-testid="add-artist-button">+</button>; });
jest.mock('@/app/_components/nav/components/Login', () => function Login() { return <div data-testid="login-component" />; });
jest.mock('@/app/_components/ActivityFeed', () => function ActivityFeed() { return <div data-testid="activity-feed" />; });
jest.mock('@/app/_components/ThemeToggle', () => ({
    ThemeToggle: function ThemeToggle() { return <button data-testid="theme-toggle" />; },
}));
jest.mock('next/link', () => {
    return function MockLink({ children, href, ...props }: any) {
        return <a href={href} {...props}>{children}</a>;
    };
});

import Nav from '@/app/_components/nav';
import NavContent from '@/app/_components/nav/NavContent';
import HomePage from '@/app/page';

describe('Nav', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('keeps homepage login in the header and search/add controls with the manifesto', () => {
        mockPathname = '/';
        render(<><Nav /><HomePage /></>);
        const nav = screen.getByRole('navigation');
        expect(within(nav).getByTestId('login-component')).toBeInTheDocument();
        expect(within(nav).queryByTestId('search-bar')).not.toBeInTheDocument();
        expect(within(nav).queryByTestId('add-artist-button')).not.toBeInTheDocument();
        const home = screen.getByRole('region', { name: 'We are music nerd' });
        expect(within(home).getByTestId('search-bar')).toBeInTheDocument();
        expect(within(home).getByTestId('add-artist-button')).toBeInTheDocument();
        expect(screen.getAllByTestId('search-bar')).toHaveLength(1);
    });

    it('renders navigation on artist pages', () => {
        mockPathname = '/artist/123';
        render(<Nav />);
        expect(screen.getByTestId('search-bar')).toBeInTheDocument();
    });

    it('renders navigation on the leaderboard page', () => {
        mockPathname = '/leaderboard';
        render(<Nav />);
        expect(screen.getByTestId('add-artist-button')).toBeInTheDocument();
    });

    it('renders navigation on the profile page', () => {
        mockPathname = '/profile';
        render(<Nav />);
        expect(screen.getByTestId('login-component')).toBeInTheDocument();
    });

    it('renders navigation on the add-artist page', () => {
        mockPathname = '/add-artist';
        render(<Nav />);
        expect(screen.getByTestId('search-bar')).toBeInTheDocument();
    });

    it('renders navigation on the admin page', () => {
        mockPathname = '/admin';
        render(<Nav />);
        expect(screen.getByTestId('search-bar')).toBeInTheDocument();
    });
});

describe('NavContent', () => {
    beforeEach(() => { mockPathname = '/artist/123'; });
    it('renders the logo link pointing to home', () => {
        render(<NavContent />);
        const logoLink = screen.getByRole('link');
        expect(logoLink).toHaveAttribute('href', '/');
        expect(screen.getByAltText('logo')).toBeInTheDocument();
    });

    it('renders the search bar', () => {
        render(<NavContent />);
        expect(screen.getByTestId('search-bar')).toBeInTheDocument();
    });

    it('renders the add artist button', () => {
        render(<NavContent />);
        expect(screen.getByTestId('add-artist-button')).toBeInTheDocument();
    });

    it('renders the login component', () => {
        render(<NavContent />);
        expect(screen.getByTestId('login-component')).toBeInTheDocument();
    });

    it('does not render a standalone theme toggle (moved to profile menu)', () => {
        render(<NavContent />);
        expect(screen.queryByTestId('theme-toggle')).not.toBeInTheDocument();
    });

    it('renders a <nav> element', () => {
        render(<NavContent />);
        expect(screen.getByRole('navigation')).toBeInTheDocument();
    });
});
