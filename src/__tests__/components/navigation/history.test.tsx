// @ts-nocheck
import React from 'react';
import { render, screen } from '@testing-library/react';

// ── Child component mocks (named functions for react/display-name) ─────────────
jest.mock('@/app/_components/nav/components/SearchBar', () =>
  function MockSearchBar() {
    return <div data-testid="search-bar" />;
  }
);

jest.mock('@/app/_components/nav/components/AddArtist', () =>
  function MockAddArtist() {
    return <div data-testid="add-artist" />;
  }
);

jest.mock('@/app/_components/nav/components/Login', () =>
  function MockLogin() {
    return <div data-testid="login" />;
  }
);

jest.mock('@/app/_components/ThemeToggle', () => ({
  ThemeToggle: function MockThemeToggle() {
    return <div data-testid="theme-toggle" />;
  },
}));

jest.mock('next/link', () =>
  function MockLink({ children, href, ...rest }) {
    return <a href={href} {...rest}>{children}</a>;
  }
);

// ── Import after mocks ────────────────────────────────────────────────────────
import NavContent from '@/app/_components/nav/NavContent';

describe('NavContent', () => {
  it('renders the logo image', () => {
    render(<NavContent />);
    expect(screen.getByAltText('logo')).toBeInTheDocument();
  });

  it('links the logo to the home page', () => {
    render(<NavContent />);
    const logoLink = screen.getByAltText('logo').closest('a');
    expect(logoLink).toHaveAttribute('href', '/');
  });

  it('renders the SearchBar', () => {
    render(<NavContent />);
    expect(screen.getByTestId('search-bar')).toBeInTheDocument();
  });

  it('renders the AddArtist component', () => {
    render(<NavContent />);
    expect(screen.getByTestId('add-artist')).toBeInTheDocument();
  });

  it('renders the ThemeToggle', () => {
    render(<NavContent />);
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
  });

  it('renders the Login component', () => {
    render(<NavContent />);
    expect(screen.getByTestId('login')).toBeInTheDocument();
  });

  it('renders all core nav elements together', () => {
    render(<NavContent />);
    expect(screen.getByAltText('logo')).toBeInTheDocument();
    expect(screen.getByTestId('search-bar')).toBeInTheDocument();
    expect(screen.getByTestId('add-artist')).toBeInTheDocument();
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('login')).toBeInTheDocument();
  });
});
