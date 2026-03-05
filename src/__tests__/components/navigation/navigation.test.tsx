// @ts-nocheck
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/app/_components/nav/NavContent', () =>
  function MockNavContent() { return <div data-testid="nav-content">NavContent</div>; }
);

let mockPathname = '/';
jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: jest.fn(() => ({ push: jest.fn() })),
  useSearchParams: jest.fn(() => ({ get: jest.fn(() => null) })),
}));

import Nav from '@/app/_components/nav';

describe('Nav', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  describe('home page (pathname = /)', () => {
    it('renders nothing on the home page', () => {
      mockPathname = '/';
      const { container } = render(<Nav />);
      expect(container.firstChild).toBeNull();
    });

    it('does NOT render NavContent on the home page', () => {
      mockPathname = '/';
      render(<Nav />);
      expect(screen.queryByTestId('nav-content')).not.toBeInTheDocument();
    });
  });

  describe('non-home pages', () => {
    it('renders NavContent on an artist page', () => {
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

    it('renders NavContent on the admin page', () => {
      mockPathname = '/admin';
      render(<Nav />);
      expect(screen.getByTestId('nav-content')).toBeInTheDocument();
    });

    it('renders NavContent on the add-artist page', () => {
      mockPathname = '/add-artist';
      render(<Nav />);
      expect(screen.getByTestId('nav-content')).toBeInTheDocument();
    });
  });
});
