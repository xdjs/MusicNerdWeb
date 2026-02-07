// @ts-nocheck

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Track callback refs so tests can invoke them
let loginCallbacks: { onComplete?: Function; onError?: Function } = {};
let logoutCallbacks: { onSuccess?: Function } = {};
let mockPrivyState = {
  ready: true,
  authenticated: false,
  user: null,
  getAccessToken: jest.fn().mockResolvedValue('mock-access-token'),
};
const mockLogin = jest.fn();
const mockPrivyLogout = jest.fn();

jest.mock('@privy-io/react-auth', () => ({
  usePrivy: () => mockPrivyState,
  useLogin: (opts) => {
    loginCallbacks = opts || {};
    return { login: mockLogin };
  },
  useLogout: (opts) => {
    logoutCallbacks = opts || {};
    return { logout: mockPrivyLogout };
  },
  useIdentityToken: () => ({ identityToken: 'mock-identity-token' }),
  getIdentityToken: jest.fn().mockResolvedValue('mock-identity-token'),
}));

const mockSignIn = jest.fn().mockResolvedValue({ ok: true, error: null });
const mockSignOut = jest.fn().mockResolvedValue({ ok: true });
let mockSessionData: any = null;
let mockSessionStatus = 'unauthenticated';

jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: mockSessionData,
    status: mockSessionStatus,
    update: jest.fn(),
  }),
  signIn: (...args) => mockSignIn(...args),
  signOut: (...args) => mockSignOut(...args),
}));

const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock LegacyAccountModal
jest.mock('@/app/_components/nav/components/LegacyAccountModal', () => ({
  LegacyAccountModal: ({ open, onClose }) =>
    open ? (
      <div data-testid="legacy-modal">
        <button onClick={onClose}>Close Modal</button>
      </div>
    ) : null,
}));

// Mock UI components
jest.mock('@/components/ui/button', () => {
  const React = require('react');
  const MockButton = React.forwardRef(({ children, onClick, disabled, className, type, id, ...props }, ref) => (
    <button ref={ref} onClick={onClick} disabled={disabled} className={className} id={id} type={type} {...props}>
      {children}
    </button>
  ));
  MockButton.displayName = 'MockButton';
  return { Button: MockButton };
});

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }) => <div data-testid="dropdown">{children}</div>,
  DropdownMenuTrigger: ({ children, asChild }) => <div data-testid="dropdown-trigger">{children}</div>,
  DropdownMenuContent: ({ children }) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onSelect, asChild, className }) => (
    <div data-testid="dropdown-item" onClick={onSelect} className={className}>
      {children}
    </div>
  ),
}));

jest.mock('lucide-react', () => ({
  Mail: () => <svg data-testid="mail-icon" />,
}));

jest.mock('next/link', () => {
  return function MockLink({ children, href, ...props }) {
    return <a href={href} {...props}>{children}</a>;
  };
});

jest.mock('@/server/utils/privyConstants', () => ({
  TOKEN_PREFIXES: {
    PRIVY_ID: 'privyid:',
    ID_TOKEN: 'idtoken:',
  },
}));

// Import the component after mocks
import PrivyLogin from '@/app/_components/nav/components/PrivyLogin';

describe('PrivyLogin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    loginCallbacks = {};
    logoutCallbacks = {};
    mockPrivyState = {
      ready: true,
      authenticated: false,
      user: null,
      getAccessToken: jest.fn().mockResolvedValue('mock-access-token'),
    };
    mockSessionData = null;
    mockSessionStatus = 'unauthenticated';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ count: 0 }),
    });
    // Mock window.location.reload - replace location with a plain object
    delete (window as any).location;
    (window as any).location = { reload: jest.fn(), href: 'http://localhost' };
  });

  describe('Loading state', () => {
    it('shows spinner when Privy is not ready', () => {
      mockPrivyState.ready = false;

      render(<PrivyLogin />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(screen.getByAltText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Unauthenticated state', () => {
    it('renders login button with Mail icon', () => {
      render(<PrivyLogin />);

      expect(screen.getByTestId('mail-icon')).toBeInTheDocument();
    });

    it('renders dropdown with Leaderboard and User Profile links', () => {
      render(<PrivyLogin />);

      expect(screen.getByText('Leaderboard')).toBeInTheDocument();
      expect(screen.getByText('User Profile')).toBeInTheDocument();
      expect(screen.getByText('Log In')).toBeInTheDocument();
    });
  });

  describe('Authenticated state', () => {
    beforeEach(() => {
      mockPrivyState.authenticated = true;
      mockSessionData = {
        user: {
          id: 'user-uuid',
          privyUserId: 'did:privy:user123',
          email: 'test@test.com',
          isAdmin: false,
          isWhiteListed: true,
          needsLegacyLink: false,
        },
        expires: '2025-12-31',
      };
      mockSessionStatus = 'authenticated';
    });

    it('renders profile avatar button', () => {
      render(<PrivyLogin />);

      expect(screen.getByAltText('Profile')).toBeInTheDocument();
    });

    it('shows Leaderboard and User Profile menu items', () => {
      render(<PrivyLogin />);

      expect(screen.getByText('Leaderboard')).toBeInTheDocument();
      expect(screen.getByText('User Profile')).toBeInTheDocument();
    });

    it('shows Log Out menu item', () => {
      render(<PrivyLogin />);

      expect(screen.getByText('Log Out')).toBeInTheDocument();
    });

    it('shows Admin Panel when user is admin', () => {
      mockSessionData.user.isAdmin = true;

      render(<PrivyLogin />);

      expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    });

    it('does not show Admin Panel for non-admin users', () => {
      render(<PrivyLogin />);

      expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
    });

    it('shows Link Wallet menu item when needsLegacyLink is true', () => {
      mockSessionData.user.needsLegacyLink = true;

      render(<PrivyLogin />);

      expect(screen.getByText('Link Wallet')).toBeInTheDocument();
    });

    it('does not show Link Wallet when needsLegacyLink is false', () => {
      render(<PrivyLogin />);

      expect(screen.queryByText('Link Wallet')).not.toBeInTheDocument();
    });
  });

  describe('Legacy account modal', () => {
    it('auto-shows modal when needsLegacyLink is true', async () => {
      mockPrivyState.authenticated = true;
      mockSessionData = {
        user: {
          id: 'user-uuid',
          needsLegacyLink: true,
          isAdmin: false,
        },
        expires: '2025-12-31',
      };
      mockSessionStatus = 'authenticated';

      render(<PrivyLogin />);

      await waitFor(() => {
        expect(screen.getByTestId('legacy-modal')).toBeInTheDocument();
      });
    });

    it('does not auto-show modal when needsLegacyLink is false', () => {
      mockPrivyState.authenticated = true;
      mockSessionData = {
        user: {
          id: 'user-uuid',
          needsLegacyLink: false,
          isAdmin: false,
        },
        expires: '2025-12-31',
      };
      mockSessionStatus = 'authenticated';

      render(<PrivyLogin />);

      expect(screen.queryByTestId('legacy-modal')).not.toBeInTheDocument();
    });
  });

  describe('Logout', () => {
    beforeEach(() => {
      mockPrivyState.authenticated = true;
      mockSessionData = {
        user: {
          id: 'user-uuid',
          isAdmin: false,
          needsLegacyLink: false,
        },
        expires: '2025-12-31',
      };
      mockSessionStatus = 'authenticated';
    });

    it('calls signOut and Privy logout on log out', async () => {
      render(<PrivyLogin />);

      const logoutItem = screen.getByText('Log Out');
      fireEvent.click(logoutItem);

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalledWith({ redirect: false });
        expect(mockPrivyLogout).toHaveBeenCalled();
      });
    });
  });

  describe('Login flow', () => {
    it('triggers Privy login when login button is clicked', () => {
      render(<PrivyLogin />);

      // The login button triggers login
      const loginItem = screen.getByText('Log In');
      fireEvent.click(loginItem);

      expect(mockLogin).toHaveBeenCalled();
    });
  });
});
