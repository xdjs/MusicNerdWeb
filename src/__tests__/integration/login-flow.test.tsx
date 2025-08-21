import { render, screen, waitFor, act } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import LeaderboardClientWrapper from '@/app/leaderboard/ClientWrapper';
import AutoRefresh from '@/app/_components/AutoRefresh';

// Mock next-auth/react
jest.mock('next-auth/react');
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

// Mock next/navigation
const mockRouter = {
  refresh: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
};

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

// Mock components
jest.mock('@/app/profile/Dashboard', () => {
  return function MockDashboard({ user }: { user: any }) {
    return (
      <div data-testid="dashboard">
        {user.username === 'Guest User' ? 'Logged Out State' : 'Logged In State'}
        {user.isWhiteListed && <span data-testid="whitelisted-feature">Whitelisted Feature</span>}
      </div>
    );
  };
});

jest.mock('@/app/profile/Leaderboard', () => {
  return function MockLeaderboard() {
    return <div data-testid="leaderboard">Leaderboard</div>;
  };
});

// Mock sessionStorage
const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

// Mock window.dispatchEvent
const mockDispatchEvent = jest.fn();
Object.defineProperty(window, 'dispatchEvent', {
  value: mockDispatchEvent,
});

// Mock fetch
global.fetch = jest.fn();

const mockAuthenticatedUser = {
  id: 'test-user-id',
  wallet: '0x1234567890123456789012345678901234567890',
  email: 'test@example.com',
  username: 'authenticateduser',
  isAdmin: false,
  isWhiteListed: true,
  isSuperAdmin: false,
  isHidden: false,
  acceptedUgcCount: 5,
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
  legacyId: null,
};

function TestComponent() {
  return (
    <div>
      <AutoRefresh />
      <LeaderboardClientWrapper />
    </div>
  );
}

describe('Login Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionStorage.getItem.mockReturnValue(null);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockAuthenticatedUser),
    });
  });

  it('should update UI immediately after login without hard refresh', async () => {
    // Start with unauthenticated state
    mockUseSession.mockReturnValue({
      status: 'unauthenticated',
      data: null,
      update: jest.fn(),
    });

    const { rerender } = render(<TestComponent />);

    // Verify logged out state
    await waitFor(() => {
      expect(screen.getByText('Logged Out State')).toBeInTheDocument();
      expect(screen.queryByTestId('whitelisted-feature')).not.toBeInTheDocument();
    });

    // Simulate successful login - session becomes authenticated
    act(() => {
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { id: 'test-user-id' } },
        update: jest.fn(),
      });
    });

    // Trigger re-render with new session state
    rerender(<TestComponent />);

    // Verify AutoRefresh triggers the refresh flow
    await waitFor(() => {
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith('autoRefreshSkipReload', 'true');
    }, { timeout: 1000 });

    // Wait for the refresh timeout to trigger
    await waitFor(() => {
      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sessionUpdated',
          detail: expect.objectContaining({
            status: 'authenticated',
            session: { user: { id: 'test-user-id' } }
          })
        })
      );
      expect(mockRouter.refresh).toHaveBeenCalled();
    }, { timeout: 1000 });

    // Verify user data is fetched
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/user/test-user-id');
    });

    // Verify logged in state is shown
    await waitFor(() => {
      expect(screen.getByText('Logged In State')).toBeInTheDocument();
      expect(screen.getByTestId('whitelisted-feature')).toBeInTheDocument();
    });

    // Verify no full page reload occurred (window.location.reload not called)
    expect(window.location.reload).not.toHaveBeenCalled();
  });

  it('should handle login flow from different pages consistently', async () => {
    // Test the same flow but ensure it works for any page with AutoRefresh
    mockUseSession.mockReturnValue({
      status: 'unauthenticated',
      data: null,
      update: jest.fn(),
    });

    const { rerender } = render(<TestComponent />);

    // Start logged out
    await waitFor(() => {
      expect(screen.getByText('Logged Out State')).toBeInTheDocument();
    });

    // Login occurs
    act(() => {
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { id: 'test-user-id' } },
        update: jest.fn(),
      });
    });

    rerender(<TestComponent />);

    // Should trigger refresh mechanism
    await waitFor(() => {
      expect(mockRouter.refresh).toHaveBeenCalled();
      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'sessionUpdated' })
      );
    }, { timeout: 1000 });

    // Should show authenticated state
    await waitFor(() => {
      expect(screen.getByText('Logged In State')).toBeInTheDocument();
    });
  });

  it('should not trigger multiple refreshes for the same login', async () => {
    // Start unauthenticated
    mockUseSession.mockReturnValue({
      status: 'unauthenticated',
      data: null,
      update: jest.fn(),
    });

    const { rerender } = render(<TestComponent />);

    // Clear any initial calls
    jest.clearAllMocks();

    // Login
    act(() => {
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { id: 'test-user-id' } },
        update: jest.fn(),
      });
    });

    rerender(<TestComponent />);

    // Wait for first refresh
    await waitFor(() => {
      expect(mockRouter.refresh).toHaveBeenCalledTimes(1);
    }, { timeout: 1000 });

    // Clear the calls again
    mockRouter.refresh.mockClear();

    // Simulate another render with same authenticated state
    rerender(<TestComponent />);

    // Wait a bit and verify no additional refresh was triggered
    await new Promise(resolve => setTimeout(resolve, 600));
    expect(mockRouter.refresh).not.toHaveBeenCalled();
  });

  it('should handle session update events in client components', async () => {
    mockUseSession.mockReturnValue({
      status: 'authenticated',
      data: { user: { id: 'test-user-id' } },
      update: jest.fn(),
    });

    render(<TestComponent />);

    // Wait for initial load and user fetch
    await waitFor(() => {
      expect(screen.getByText('Logged In State')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/user/test-user-id');
    });

    // Clear fetch mock for the event test
    (global.fetch as jest.Mock).mockClear();

    // Trigger session update event directly - this should trigger loading state
    // which will cause the user data to be refetched
    act(() => {
      window.dispatchEvent(new CustomEvent('sessionUpdated', {
        detail: { status: 'authenticated', session: { user: { id: 'test-user-id' } } }
      }));
    });

    // Should show loading state first
    await waitFor(() => {
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    // Then should trigger user data refetch
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/user/test-user-id');
    });
  });
});
