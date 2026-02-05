// @ts-nocheck
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// Set up mock state that the mock factories will reference
let mockPrivyReady = true;
let mockPrivyAuthenticated = false;
let mockPrivyUser = null;
let mockSessionData = null;
let mockSessionStatus = 'unauthenticated';

const mockLogin = jest.fn();
const mockLogout = jest.fn();
const mockGetAccessToken = jest.fn();
const mockSignIn = jest.fn().mockResolvedValue({ ok: true, error: null });
const mockSignOut = jest.fn().mockResolvedValue({ ok: true });
const mockUpdate = jest.fn();
const mockToast = jest.fn();

jest.mock('@privy-io/react-auth', () => ({
  usePrivy: () => ({
    ready: mockPrivyReady,
    authenticated: mockPrivyAuthenticated,
    user: mockPrivyUser,
    getAccessToken: mockGetAccessToken,
  }),
  useLogin: (callbacks) => {
    return { login: mockLogin };
  },
  useLogout: (callbacks) => {
    return { logout: mockLogout };
  },
  useIdentityToken: () => ({ identityToken: 'mock-id-token' }),
  getIdentityToken: jest.fn().mockResolvedValue('mock-id-token'),
  useLinkAccount: () => ({ linkWallet: jest.fn() }),
  PrivyProvider: ({ children }) => children,
}));

jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: mockSessionData,
    status: mockSessionStatus,
    update: mockUpdate,
  }),
  signIn: (...args) => mockSignIn(...args),
  signOut: (...args) => mockSignOut(...args),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

jest.mock('@/app/_components/nav/components/LegacyAccountModal', () => ({
  LegacyAccountModal: ({ open, onClose }) =>
    open ? <div data-testid="legacy-modal"><button onClick={onClose}>Close</button></div> : null,
}));

jest.mock('@/server/utils/privyConstants', () => ({
  TOKEN_PREFIXES: {
    PRIVY_ID: 'privyid:',
    ID_TOKEN: 'idtoken:',
  },
}));

// Import component after all mocks
const PrivyLogin = require('@/app/_components/nav/components/PrivyLogin').default;

describe('PrivyLogin', () => {
  beforeEach(() => {
    mockPrivyReady = true;
    mockPrivyAuthenticated = false;
    mockPrivyUser = null;
    mockSessionData = null;
    mockSessionStatus = 'unauthenticated';
    mockLogin.mockClear();
    mockLogout.mockClear();
    mockGetAccessToken.mockReset();
    mockSignIn.mockReset().mockResolvedValue({ ok: true, error: null });
    mockSignOut.mockReset().mockResolvedValue({ ok: true });
    mockToast.mockClear();
    (global.fetch as jest.Mock).mockReset().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ count: 0 }),
      status: 200,
    });
  });

  it('shows loading spinner when Privy is not ready', () => {
    mockPrivyReady = false;

    render(<PrivyLogin />);

    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
  });

  it('shows login button when not authenticated', () => {
    render(<PrivyLogin />);

    const btn = screen.getByRole('button');
    expect(btn).not.toBeDisabled();
  });

  it('calls Privy login when login button is clicked', () => {
    render(<PrivyLogin />);

    const btn = screen.getByRole('button');
    fireEvent.click(btn);

    expect(mockLogin).toHaveBeenCalled();
  });

  it('shows profile image when authenticated', () => {
    mockSessionData = {
      user: {
        id: 'user-1',
        email: 'test@test.com',
        isAdmin: false,
        needsLegacyLink: false,
      },
      expires: '2030-01-01',
    };
    mockSessionStatus = 'authenticated';

    render(<PrivyLogin />);

    const profileBtn = screen.getByRole('button');
    const img = profileBtn.querySelector('img[alt="Profile"]');
    expect(img).toBeInTheDocument();
  });

  it('renders admin dropdown trigger for admin users', () => {
    mockSessionData = {
      user: {
        id: 'admin-1',
        email: 'admin@test.com',
        isAdmin: true,
        needsLegacyLink: false,
      },
      expires: '2030-01-01',
    };
    mockSessionStatus = 'authenticated';

    render(<PrivyLogin />);

    // Verify the authenticated dropdown trigger renders (profile image button)
    const trigger = screen.getByRole('button');
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
  });

  it('renders legacy link modal when user needs legacy link', async () => {
    mockSessionData = {
      user: {
        id: 'new-1',
        email: 'new@test.com',
        isAdmin: false,
        needsLegacyLink: true,
      },
      expires: '2030-01-01',
    };
    mockSessionStatus = 'authenticated';

    render(<PrivyLogin />);

    // The legacy modal should auto-show for users needing wallet link
    await waitFor(() => {
      expect(screen.getByTestId('legacy-modal')).toBeInTheDocument();
    });
  });

  it('renders dropdown menu trigger with correct attributes', () => {
    mockSessionData = {
      user: {
        id: 'user-1',
        email: 'test@test.com',
        isAdmin: false,
        needsLegacyLink: false,
      },
      expires: '2030-01-01',
    };
    mockSessionStatus = 'authenticated';

    render(<PrivyLogin />);

    const trigger = screen.getByRole('button');
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    // Profile image rendered inside trigger
    const img = trigger.querySelector('img[alt="Profile"]');
    expect(img).toBeInTheDocument();
  });

  it('shows notification badge when there is pending UGC', async () => {
    mockSessionData = {
      user: {
        id: 'admin-1',
        email: 'admin@test.com',
        isAdmin: true,
        needsLegacyLink: false,
      },
      expires: '2030-01-01',
    };
    mockSessionStatus = 'authenticated';

    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === '/api/pendingUGCCount') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ count: 5 }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ count: 0 }) });
    });

    render(<PrivyLogin />);

    await waitFor(() => {
      const badge = document.querySelector('.bg-red-600');
      expect(badge).toBeInTheDocument();
    });
  });
});
