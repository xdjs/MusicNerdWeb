// @ts-nocheck
import React from 'react';
import { render, screen } from '@testing-library/react';

let mockPathname = '/';

jest.mock('next/navigation', () => ({
    usePathname: () => mockPathname,
    useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
    useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@/app/_components/nav/components/SearchBar', () => function SearchBar() { return <div data-testid="search-bar" />; });
jest.mock('@/app/_components/nav/components/AddArtist', () => function AddArtist() { return <button data-testid="add-artist-button">+</button>; });
jest.mock('@/app/_components/nav/components/Login', () => function Login() { return <div data-testid="login-component" />; });
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

describe('Nav', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders null on the home page ("/")', () => {
        mockPathname = '/';
        const { container } = render(<Nav />);
        expect(container.firstChild).toBeNull();
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

    it('renders the theme toggle', () => {
        render(<NavContent />);
        expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    });

    it('renders a <nav> element', () => {
        render(<NavContent />);
        expect(screen.getByRole('navigation')).toBeInTheDocument();
    });
});
