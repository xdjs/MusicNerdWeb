import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import LeaderboardClientWrapper from '@/app/leaderboard/ClientWrapper';
import ProfileClientWrapper from '@/app/profile/ClientWrapper';

// Mock next-auth/react
jest.mock('next-auth/react');
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

// Mock the Dashboard and Leaderboard components
jest.mock('@/app/profile/Dashboard', () => {
  return function MockDashboard({ user }: { user: any }) {
    return (
      <div data-testid="dashboard">
        Dashboard for {user.username || user.wallet}
        {user.isWhiteListed && <span data-testid="whitelisted">Whitelisted</span>}
        {user.isAdmin && <span data-testid="admin">Admin</span>}
      </div>
    );
  };
});

jest.mock('@/app/profile/Leaderboard', () => {
  return function MockLeaderboard({ highlightIdentifier }: { highlightIdentifier: string }) {
    return <div data-testid="leaderboard">Leaderboard highlighting {highlightIdentifier}</div>;
  };
});

jest.mock('@/app/_components/AutoRefresh', () => {
  return function MockAutoRefresh() {
    return <div data-testid="auto-refresh" />;
  };
});

// Mock fetch
global.fetch = jest.fn();

const mockUser = {
  id: 'test-user-id',
  wallet: '0x1234567890123456789012345678901234567890',
  email: 'test@example.com',
  username: 'testuser',
  isAdmin: false,
  isWhiteListed: true,
  isSuperAdmin: false,
  isHidden: false,
  acceptedUgcCount: 5,
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
  legacyId: null,
};

describe('ClientWrapper Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockUser),
    });
  });

  describe('LeaderboardClientWrapper', () => {
    it('should show loading spinner when session is loading', () => {
      mockUseSession.mockReturnValue({
        status: 'loading',
        data: null,
        update: jest.fn(),
      });

      render(<LeaderboardClientWrapper />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should render guest user when not authenticated', async () => {
      mockUseSession.mockReturnValue({
        status: 'unauthenticated',
        data: null,
        update: jest.fn(),
      });

      render(<LeaderboardClientWrapper />);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
        expect(screen.getByText('Dashboard for Guest User')).toBeInTheDocument();
        expect(screen.getByTestId('leaderboard')).toBeInTheDocument();
      });
    });

    it('should fetch and render authenticated user data', async () => {
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { id: 'test-user-id' } },
        update: jest.fn(),
      });

      render(<LeaderboardClientWrapper />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/user/test-user-id');
        expect(screen.getByText('Dashboard for testuser')).toBeInTheDocument();
        expect(screen.getByTestId('whitelisted')).toBeInTheDocument();
        expect(screen.queryByTestId('admin')).not.toBeInTheDocument();
      });
    });

    it('should handle session update events', async () => {
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { id: 'test-user-id' } },
        update: jest.fn(),
      });

      render(<LeaderboardClientWrapper />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Dashboard for testuser')).toBeInTheDocument();
      });

      // Clear the fetch mock and set up new response
      jest.clearAllMocks();
      const updatedUser = { ...mockUser, isAdmin: true };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(updatedUser),
      });

      // Trigger session update event - the event listener sets isLoading to true
      // which will trigger the useEffect to refetch user data
      act(() => {
        fireEvent(window, new CustomEvent('sessionUpdated'));
      });

      // The component should show loading state and then refetch user data
      await waitFor(() => {
        expect(screen.getByText('Loading...')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/user/test-user-id');
      });
    });

    it('should handle fetch errors gracefully', async () => {
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { id: 'test-user-id' } },
        update: jest.fn(),
      });

      (global.fetch as jest.Mock).mockRejectedValue(new Error('Fetch failed'));

      render(<LeaderboardClientWrapper />);

      await waitFor(() => {
        // Should fall back to guest user
        expect(screen.getByText('Dashboard for Guest User')).toBeInTheDocument();
      });
    });
  });

  describe('ProfileClientWrapper', () => {
    it('should render authenticated user data', async () => {
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { id: 'test-user-id' } },
        update: jest.fn(),
      });

      render(<ProfileClientWrapper />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/user/test-user-id');
        expect(screen.getByText('Dashboard for testuser')).toBeInTheDocument();
        expect(screen.getByTestId('whitelisted')).toBeInTheDocument();
      });
    });

    it('should handle session update events', async () => {
      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
      
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { id: 'test-user-id' } },
        update: jest.fn(),
      });

      render(<ProfileClientWrapper />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Dashboard for testuser')).toBeInTheDocument();
      });

      // Trigger session update event
      fireEvent(window, new CustomEvent('sessionUpdated'));

      expect(consoleSpy).toHaveBeenCalledWith('[ProfileClient] Session update detected, refetching user data');
      
      consoleSpy.mockRestore();
    });
  });
});
