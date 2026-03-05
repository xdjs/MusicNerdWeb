// @ts-nocheck
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

let loginCallbacks = {};
let mockPrivyState = { ready: true, authenticated: false, user: null, getAccessToken: jest.fn().mockResolvedValue('test-token') };
const mockLogin = jest.fn();
const mockPrivyLogout = jest.fn();

jest.mock('@privy-io/react-auth', () => ({
  usePrivy: () => mockPrivyState,
  useLogin: (opts) => { loginCallbacks = opts || {}; return { login: mockLogin }; },
  useLogout: () => ({ logout: mockPrivyLogout }),
  useIdentityToken: () => ({ identityToken: null }),
  getIdentityToken: jest.fn().mockResolvedValue(null),
}));

let mockSessionData = null;
let mockSessionStatus = 'unauthenticated';
const mockSignIn = jest.fn().mockResolvedValue({ ok: true, error: null });
const mockSignOut = jest.fn().mockResolvedValue({ ok: true });

jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: mockSessionData, status: mockSessionStatus, update: jest.fn() }),
  signIn: (...args) => mockSignIn(...args),
  signOut: (...args) => mockSignOut(...args),
}));

jest.mock('@/components/ui/button', () => {
  const React = require('react');
  const MockButton = React.forwardRef(({ children, onClick, disabled, id, type, ...rest }, ref) => (
    <button ref={ref} onClick={onClick} disabled={disabled} id={id} type={type} {...rest}>{children}</button>
  ));
  MockButton.displayName = 'MockButton';
  return { Button: MockButton };
});

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onSelect }) => <div role="menuitem" onClick={onSelect}>{children}</div>,
}));

jest.mock('lucide-react', () => ({ LogIn: () => <svg data-testid="login-icon" /> }));
jest.mock('next/link', () => function MockLink({ children, href }) { return <a href={href}>{children}</a>; });
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: jest.fn() }) }));
jest.mock('@/app/_components/nav/components/LegacyAccountModal', () => ({
  LegacyAccountModal: ({ open, onClose }) =>
    open ? <div data-testid="legacy-modal"><button onClick={onClose}>Close</button></div> : null,
}));
jest.mock('@/server/utils/privyConstants', () => ({
  TOKEN_PREFIXES: { PRIVY_ID: 'privyid:', ID_TOKEN: 'idtoken:' },
}));

import PrivyLogin from '@/app/_components/nav/components/PrivyLogin';

describe('Login flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    loginCallbacks = {};
    mockPrivyState = { ready: true, authenticated: false, user: null, getAccessToken: jest.fn().mockResolvedValue('test-token') };
    mockSessionData = null;
    mockSessionStatus = 'unauthenticated';
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ count: 0 }) });
    delete window.location;
    window.location = { reload: jest.fn(), href: 'http://localhost' };
  });

  describe('unauthenticated', () => {
    it('renders the login icon when not authenticated', () => {
      render(<PrivyLogin />);
      expect(screen.getByTestId('login-icon')).toBeInTheDocument();
    });

    it('shows loading spinner when Privy is not ready', () => {
      mockPrivyState.ready = false;
      render(<PrivyLogin />);
      expect(screen.getByAltText('Loading...')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('calls Privy login() when "Log In" is clicked', () => {
      render(<PrivyLogin />);
      fireEvent.click(screen.getByText('Log In'));
      expect(mockLogin).toHaveBeenCalledTimes(1);
    });
  });

  describe('onComplete callback', () => {
    it('calls NextAuth signIn after Privy onComplete (fresh login)', async () => {
      mockPrivyState.authenticated = true;
      mockPrivyState.user = { id: 'did:privy:user123' };
      render(<PrivyLogin />);
      await loginCallbacks.onComplete?.({ user: { id: 'did:privy:user123' }, isNewUser: false, wasAlreadyAuthenticated: false });
      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('privy', expect.objectContaining({ redirect: false }));
      });
    });

    it('does NOT call NextAuth signIn when wasAlreadyAuthenticated and NextAuth is in sync', async () => {
      mockPrivyState.authenticated = true;
      mockSessionStatus = 'authenticated';
      mockSessionData = { user: { id: 'user-1' } };
      render(<PrivyLogin />);
      await loginCallbacks.onComplete?.({ user: { id: 'did:privy:user123' }, isNewUser: false, wasAlreadyAuthenticated: true });
      expect(mockSignIn).not.toHaveBeenCalled();
    });
  });

  describe('authenticated', () => {
    beforeEach(() => {
      mockPrivyState.authenticated = true;
      mockSessionData = { user: { id: 'user-uuid', isAdmin: false, needsLegacyLink: false }, expires: '2099-01-01' };
      mockSessionStatus = 'authenticated';
    });

    it('shows the profile avatar when authenticated', () => {
      render(<PrivyLogin />);
      expect(screen.getByAltText('Profile')).toBeInTheDocument();
    });

    it('calls signOut and privyLogout when logging out', async () => {
      render(<PrivyLogin />);
      fireEvent.click(screen.getByText('Log Out'));
      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalledWith({ redirect: false });
        expect(mockPrivyLogout).toHaveBeenCalled();
      });
    });
  });
});
