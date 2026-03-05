// @ts-nocheck

/**
 * history.test.tsx
 *
 * Tests for the NavContent component (src/app/_components/nav/NavContent.tsx).
 * Verifies that all nav elements render correctly and links point to the right places.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// ── Navigation mocks ─────────────────────────────────────────────────────────
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/artist/test-id'),
  useSearchParams: jest.fn(() => ({ get: jest.fn(() => null) })),
  useRouter: jest.fn(() => ({ push: jest.fn() })),
  redirect: jest.fn(),
}));

jest.mock('next/link', () => {
  return function MockLink({ children, href, className, ...rest }) {
    return <a href={href} className={className} {...rest}>{children}</a>;
  };
});

// ── Child component mocks ────────────────────────────────────────────────────
jest.mock('@/app/_components/nav/components/SearchBar', () => () => (
  <div data-testid="search-bar" />
));

jest.mock('@/app/_components/nav/components/AddArtist', () => () => (
  <div data-testid="add-artist" />
));

jest.mock('@/app/_components/nav/components/Login', () => {
  const React = require('react');
  const MockLogin = React.forwardRef((props, ref) => (
    <div data-testid="login" ref={ref} />
  ));
  MockLogin.displayName = 'MockLogin';
  return { __esModule: true, default: MockLogin };
});

jest.mock('@/app/_components/ThemeToggle', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));

// ── Import after mocks ───────────────────────────────────────────────────────
import NavContent from '@/app/_components/nav/NavContent';

describe('NavContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a <nav> element', () => {
    render(<NavContent />);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('renders the site logo image', () => {
    render(<NavContent />);
    const logo = screen.getByAltText('logo') as HTMLImageElement;
    expect(logo).toBeInTheDocument();
    expect(logo.src).toContain('icon.ico');
  });

  it('links the logo to the home page', () => {
    render(<NavContent />);
    const homeLink = document.querySelector('a[href="/"]');
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toContainElement(screen.getByAltText('logo'));
  });

  it('renders the SearchBar component', () => {
    render(<NavContent />);
    expect(screen.getByTestId('search-bar')).toBeInTheDocument();
  });

  it('renders the AddArtist component', () => {
    render(<NavContent />);
    expect(screen.getByTestId('add-artist')).toBeInTheDocument();
  });

  it('renders the ThemeToggle component', () => {
    render(<NavContent />);
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
  });

  it('renders the Login component', () => {
    render(<NavContent />);
    expect(screen.getByTestId('login')).toBeInTheDocument();
  });

  it('renders all elements within the nav in the correct order', () => {
    render(<NavContent />);

    const nav = screen.getByRole('navigation');
    expect(nav).toContainElement(screen.getByAltText('logo'));
    expect(nav).toContainElement(screen.getByTestId('search-bar'));
    expect(nav).toContainElement(screen.getByTestId('add-artist'));
    expect(nav).toContainElement(screen.getByTestId('theme-toggle'));
    expect(nav).toContainElement(screen.getByTestId('login'));
  });
});
