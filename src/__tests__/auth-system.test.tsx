import { render, screen, waitFor } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import { AuthProvider } from '@/app/_components/AuthContext';
import { AuthenticatedOnly, UnauthenticatedOnly, AdminOnly, WhitelistedOnly } from '@/app/_components/AuthGuard';
import PleaseLoginPage from '@/app/_components/PleaseLoginPage';
import AuthenticatedHomeContent from '@/app/_components/AuthenticatedHomeContent';
import AuthenticatedNav from '@/app/_components/AuthenticatedNav';

// Mock components
jest.mock('@/app/_components/nav/components/Login', () => {
  return function MockLogin() {
    return <div data-testid="login-component">Login Component</div>;
  };
});

jest.mock('@/app/_components/nav/components/SearchBar', () => {
  return function MockSearchBar() {
    return <div data-testid="search-bar">Search Bar</div>;
  };
});

// Test wrapper component
function TestWrapper({ children, session = null }: { children: React.ReactNode; session?: any }) {
  return (
    <SessionProvider session={session}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </SessionProvider>
  );
}

describe('Authentication System', () => {
  describe('AuthGuard Components', () => {
    it('should render children when user is authenticated', async () => {
      const mockSession = {
        user: {
          id: '123',
          name: 'Test User',
          isAdmin: false,
          isWhiteListed: false,
        },
      };

      render(
        <TestWrapper session={mockSession}>
          <AuthenticatedOnly>
            <div data-testid="authenticated-content">Authenticated Content</div>
          </AuthenticatedOnly>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated-content')).toBeInTheDocument();
      });
    });

    it('should render fallback when user is not authenticated', async () => {
      render(
        <TestWrapper>
          <AuthenticatedOnly fallback={<div data-testid="fallback">Please log in</div>}>
            <div data-testid="authenticated-content">Authenticated Content</div>
          </AuthenticatedOnly>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('fallback')).toBeInTheDocument();
        expect(screen.queryByTestId('authenticated-content')).not.toBeInTheDocument();
      });
    });

    it('should render children when user is not authenticated for UnauthenticatedOnly', async () => {
      render(
        <TestWrapper>
          <UnauthenticatedOnly>
            <div data-testid="unauthenticated-content">Unauthenticated Content</div>
          </UnauthenticatedOnly>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('unauthenticated-content')).toBeInTheDocument();
      });
    });

    it('should render fallback when user is authenticated for UnauthenticatedOnly', async () => {
      const mockSession = {
        user: {
          id: '123',
          name: 'Test User',
        },
      };

      render(
        <TestWrapper session={mockSession}>
          <UnauthenticatedOnly fallback={<div data-testid="fallback">Already logged in</div>}>
            <div data-testid="unauthenticated-content">Unauthenticated Content</div>
          </UnauthenticatedOnly>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('fallback')).toBeInTheDocument();
        expect(screen.queryByTestId('unauthenticated-content')).not.toBeInTheDocument();
      });
    });

    it('should render children when user is admin', async () => {
      const mockSession = {
        user: {
          id: '123',
          name: 'Admin User',
          isAdmin: true,
        },
      };

      render(
        <TestWrapper session={mockSession}>
          <AdminOnly>
            <div data-testid="admin-content">Admin Content</div>
          </AdminOnly>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('admin-content')).toBeInTheDocument();
      });
    });

    it('should render fallback when user is not admin', async () => {
      const mockSession = {
        user: {
          id: '123',
          name: 'Regular User',
          isAdmin: false,
        },
      };

      render(
        <TestWrapper session={mockSession}>
          <AdminOnly fallback={<div data-testid="fallback">Admin access required</div>}>
            <div data-testid="admin-content">Admin Content</div>
          </AdminOnly>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('fallback')).toBeInTheDocument();
        expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
      });
    });
  });

  describe('PleaseLoginPage', () => {
    it('should render login page when user is not authenticated', async () => {
      render(
        <TestWrapper>
          <PleaseLoginPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Please Log In')).toBeInTheDocument();
        expect(screen.getByText('You need to be logged in to view this content.')).toBeInTheDocument();
        expect(screen.getByTestId('login-component')).toBeInTheDocument();
      });
    });

    it('should not render when user is authenticated', async () => {
      const mockSession = {
        user: {
          id: '123',
          name: 'Test User',
        },
      };

      render(
        <TestWrapper session={mockSession}>
          <PleaseLoginPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText('Please Log In')).not.toBeInTheDocument();
      });
    });
  });

  describe('AuthenticatedHomeContent', () => {
    it('should show authenticated content when user is logged in', async () => {
      const mockSession = {
        user: {
          id: '123',
          name: 'Test User',
        },
      };

      render(
        <TestWrapper session={mockSession}>
          <AuthenticatedHomeContent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Welcome back!')).toBeInTheDocument();
        expect(screen.getByText("You're logged in and ready to explore music artists.")).toBeInTheDocument();
        expect(screen.getByText('View Profile')).toBeInTheDocument();
        expect(screen.getByText('Leaderboard')).toBeInTheDocument();
      });
    });

    it('should show unauthenticated content when user is not logged in', async () => {
      render(
        <TestWrapper>
          <AuthenticatedHomeContent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Get Started')).toBeInTheDocument();
        expect(screen.getByText('Connect your wallet to add artists and manage your collection.')).toBeInTheDocument();
        expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
        expect(screen.getByText('Learn More')).toBeInTheDocument();
      });
    });
  });

  describe('AuthenticatedNav', () => {
    it('should show profile and leaderboard links when authenticated', async () => {
      const mockSession = {
        user: {
          id: '123',
          name: 'Test User',
        },
      };

      render(
        <TestWrapper session={mockSession}>
          <AuthenticatedNav />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Profile')).toBeInTheDocument();
        expect(screen.getByText('Leaderboard')).toBeInTheDocument();
      });
    });

    it('should show about and help links when not authenticated', async () => {
      render(
        <TestWrapper>
          <AuthenticatedNav />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('About')).toBeInTheDocument();
        expect(screen.getByText('Help')).toBeInTheDocument();
      });
    });
  });
});
