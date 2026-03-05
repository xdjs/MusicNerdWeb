// @ts-nocheck

/**
 * navigation.test.tsx
 *
 * Tests for the Nav component (src/app/_components/nav/index.tsx).
 * Verifies the nav is hidden on the home page and visible on all other routes.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// ── Pathname mock (writable per test) ────────────────────────────────────────
let mockPathname = '/';

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useSearchParams: jest.fn(() => ({ get: jest.fn(() => null) })),
  useRouter: jest.fn(() => ({ push: jest.fn() })),
  redirect: jest.fn(),
}));

// ── Child component mock ─────────────────────────────────────────────────────
jest.mock('@/app/_components/nav/NavContent', () => () => (
  <div data-testid="nav-content">NavContent</div>
));

// ── Import after mocks ───────────────────────────────────────────────────────
import Nav from '@/app/_components/nav';

describe('Nav – route-based visibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing on the home page (/)', () => {
    mockPathname = '/';
    const { container } = render(<Nav />);
    expect(container.firstChild).toBeNull();
  });

  it('does NOT render NavContent on the home page', () => {
    mockPathname = '/';
    render(<Nav />);
    expect(screen.queryByTestId('nav-content')).not.toBeInTheDocument();
  });

  it('renders NavContent on the artist page', () => {
    mockPathname = '/artist/artist-123';
    render(<Nav />);
    expect(screen.getByTestId('nav-content')).toBeInTheDocument();
  });

  it('renders NavContent on the leaderboard page', () => {
    mockPathname = '/leaderboard';
    render(<Nav />);
    expect(screen.getByTestId('nav-content')).toBeInTheDocument();
  });

  it('renders NavContent on the profile page', () => {
    mockPathname = '/profile';
    render(<Nav />);
    expect(screen.getByTestId('nav-content')).toBeInTheDocument();
  });

  it('renders NavContent on the add-artist page', () => {
    mockPathname = '/add-artist';
    render(<Nav />);
    expect(screen.getByTestId('nav-content')).toBeInTheDocument();
  });

  it('renders NavContent on the admin page', () => {
    mockPathname = '/admin';
    render(<Nav />);
    expect(screen.getByTestId('nav-content')).toBeInTheDocument();
  });

  it('renders NavContent on any deep artist route', () => {
    mockPathname = '/artist/abc123/edit';
    render(<Nav />);
    expect(screen.getByTestId('nav-content')).toBeInTheDocument();
  });

  it('does not render on exactly "/" regardless of trailing content', () => {
    // Only exactly "/" should be hidden
    mockPathname = '/';
    render(<Nav />);
    expect(screen.queryByTestId('nav-content')).not.toBeInTheDocument();
  });

  it('renders NavContent when pathname is "/search"', () => {
    mockPathname = '/search';
    render(<Nav />);
    expect(screen.getByTestId('nav-content')).toBeInTheDocument();
  });
});
