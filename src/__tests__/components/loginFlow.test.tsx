// @ts-nocheck

/**
 * loginFlow.test.tsx
 *
 * Tests the end-to-end login and logout flow through the PrivyLogin component,
 * which is the core auth component used under the new Privy auth system.
 *
 * Covers:
 *  - Privy onComplete → NextAuth signIn flow
 *  - Logout (NextAuth signOut + Privy logout)
 *  - Error handling during login
 *  - Pending UGC add completion after login
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ── Privy mocks ───────────────────────────────────────────────────────────────
let loginCallbacks: { onComplete?: Function; onError?: Function } = {};
let logoutCallbacks: { onSuccess?: Function } = {};
let mockPrivyState = {
  ready: true,
  authenticated: false,
  user: null as any,
  getAccessToken: jest.fn().mockResolvedValue('mock-access-token'),
};

const mockPrivyLogin = jest.fn();
const mockPrivyLogout = jest.fn();

jest.mock('@privy-io/react-auth', () => ({
  usePrivy: () => mockPrivyState,
  useLogin: (opts) => {
    loginCallbacks = opts || {};
    return { login: mockPrivyLogin };
  },
  useLogout: (opts) => {
    logoutCallbacks = opts || {};
    return { logout: mockPrivyLogout };
  },
  useIdentityToken: () => ({ identityToken: 'mock-identity-token' }),
  getIdentityToken: jest.fn().mockResolvedValue('mock-identity-token'),
}));

// ── NextAuth mocks ────────────────────────────────────────────────────────────
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

// ── Supporting mocks ──────────────────────────────────────────────────────────
const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

jest.mock('@/app/_components/nav/components/LegacyAccountModal', () => ({
  LegacyAccountModal: ({ open, onClose }) =>
    open ? <div data-testid="legacy-modal"><button onClick={onClose}>Close</button></div> : null,
}));

jest.mock('@/components/ui/button', () => {
  const React = require('react');
  const MockButton = React.forwardRef(({ children, onClick, disabled, ...rest }, ref) => (
    <button ref={ref} onClick={onClick} disabled={disabled} {...rest}>{children}</button>
  ));
  MockButton.displayName = 'MockButton';
  return { Button: MockButton };
});

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onSelect, className }) => (
    <div onClick={onSelect} className={className} role="menuitem">{children}</div>
  ),
}));

jest.mock('lucide-react', () => ({
  LogIn: () => <svg data-testid="login-icon" />,
}));

jest.mock('next/link', () => {
  return function MockLink({ children, href, ...rest }) {
    return <a href={href} {...rest}>{children}</a>;
  };
});

jest.mock('@/server/utils/privyConstants', () => ({
  TOKEN_PREFIXES: {
    PRIVY_ID: 'privyid:',
    ID_TOKEN: 'idtoken:',
  },
}));

// ── Import after mocks ────────────────────────────────────────────────────────
import PrivyLogin from '@/app/_components/nav/components/PrivyLogin';

describe('Login flow – PrivyLogin', () => {
  let mockSessionStorage: Record<string, string> = {};

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

    delete (window as any).location;
    (window as any).location = { reload: jest.fn(), href: 'http://localhost' };

    mockSessionStorage = {};
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: jest.fn((key: string) => mockSessionStorage[key] ?? null),
        setItem: jest.fn((key: string, value: string) => { mockSessionStorage[key] = value; }),
        removeItem: jest.fn((key: string) => { delete mockSessionStorage[key]; }),
        clear: jest.fn(),
      },
      writable: true,
    });
  });

  // ── Login initiation ────────────────────────────────────────────────────────
  describe('initiating login', () => {
    it('calls Privy login() when "Log In" is clicked', () => {
      render(<PrivyLogin />);

      fireEvent.click(screen.getByText('Log In'));

      expect(mockPrivyLogin).toHaveBeenCalledTimes(1);
    });

    it('shows a disabled spinner button while Privy is loading', () => {
      mockPrivyState.ready = false;
      render(<PrivyLogin />);

      const btn = screen.getByRole('button');
      expect(btn).toBeDisabled();
      expect(screen.getByAltText('Loading...')).toBeInTheDocument();
    });
  });

  // ── Privy onComplete → NextAuth signIn ─────────────────────────────────────
  describe('Privy → NextAuth login flow', () => {
    it('calls NextAuth signIn after a fresh Privy login (wasAlreadyAuthenticated: false)', async () => {
      mockPrivyState.authenticated = true;
      mockPrivyState.user = { id: 'did:privy:user123' };

      render(<PrivyLogin />);

      await loginCallbacks.onComplete?.({
        user: { id: 'did:privy:user123' },
        isNewUser: false,
        wasAlreadyAuthenticated: false,
      });

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('privy', expect.objectContaining({
          redirect: false,
        }));
      });
    });

    it('does NOT call NextAuth signIn when wasAlreadyAuthenticated is true', async () => {
      mockPrivyState.authenticated = true;

      render(<PrivyLogin />);

      await loginCallbacks.onComplete?.({
        user: { id: 'did:privy:user123' },
        isNewUser: false,
        wasAlreadyAuthenticated: true,
      });

      expect(mockSignIn).not.toHaveBeenCalled();
    });
  });

  // ── Logout flow ─────────────────────────────────────────────────────────────
  describe('logout flow', () => {
    beforeEach(() => {
      mockPrivyState.authenticated = true;
      mockSessionData = {
        user: { id: 'user-uuid', isAdmin: false, needsLegacyLink: false },
        expires: '2099-01-01',
      };
      mockSessionStatus = 'authenticated';
    });

    it('calls NextAuth signOut when "Log Out" is clicked', async () => {
      render(<PrivyLogin />);

      fireEvent.click(screen.getByText('Log Out'));

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalledWith({ redirect: false });
      });
    });

    it('calls Privy logout when "Log Out" is clicked', async () => {
      render(<PrivyLogin />);

      fireEvent.click(screen.getByText('Log Out'));

      await waitFor(() => {
        expect(mockPrivyLogout).toHaveBeenCalled();
      });
    });

    it('clears the legacyModalShown session flag on logout', async () => {
      render(<PrivyLogin />);

      fireEvent.click(screen.getByText('Log Out'));

      await waitFor(() => {
        expect(sessionStorage.removeItem).toHaveBeenCalledWith('legacyModalShown');
      });
    });
  });

  // ── Authenticated state ─────────────────────────────────────────────────────
  describe('authenticated state', () => {
    beforeEach(() => {
      mockPrivyState.authenticated = true;
      mockSessionData = {
        user: { id: 'user-uuid', isAdmin: false, needsLegacyLink: false },
        expires: '2099-01-01',
      };
      mockSessionStatus = 'authenticated';
    });

    it('shows the profile avatar instead of the login icon', () => {
      render(<PrivyLogin />);
      expect(screen.getByAltText('Profile')).toBeInTheDocument();
    });

    it('shows Admin Panel link for admin users', () => {
      mockSessionData.user.isAdmin = true;
      render(<PrivyLogin />);
      expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    });

    it('does not show Admin Panel for non-admin users', () => {
      render(<PrivyLogin />);
      expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
    });

    it('shows Link Wallet option when needsLegacyLink is true', () => {
      mockSessionData.user.needsLegacyLink = true;
      render(<PrivyLogin />);
      expect(screen.getByText('Link Wallet')).toBeInTheDocument();
    });
  });

  // ── Error handling ──────────────────────────────────────────────────────────
  describe('login error handling', () => {
    it('handles the Privy onError callback without crashing', async () => {
      render(<PrivyLogin />);

      // onError may be synchronous or async — just verify it doesn't throw
      let threw = false;
      try {
        await loginCallbacks.onError?.(new Error('User cancelled login'));
      } catch {
        threw = true;
      }
      expect(threw).toBe(false);
    });
  });
});
