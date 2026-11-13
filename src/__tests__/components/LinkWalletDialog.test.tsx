// @ts-nocheck

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LinkWalletDialog } from '@/app/_components/nav/components/LinkWalletDialog';

const mockGetAccessToken = jest.fn();

// Track callback refs so tests can invoke them
let linkAccountCallbacks: { onSuccess?: Function; onError?: Function } = {};

jest.mock('@privy-io/react-auth', () => ({
  getAccessToken: () => mockGetAccessToken(),
  useLinkAccount: (opts) => {
    linkAccountCallbacks = opts || {};
    return {
      linkWallet: jest.fn(),
    };
  },
}));

const mockRefetchAccount = jest.fn();
jest.mock('@/hooks/useMusicNerdUser', () => ({
  useMusicNerdUser: () => ({
    user: { id: 'test-user' },
    status: 'authenticated',
    refetch: mockRefetchAccount,
  }),
}));

// Mock the toast hook
const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));


// Mock Radix Dialog to render in JSDOM without portals
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children, className }) => <div data-testid="dialog-content" className={className}>{children}</div>,
  DialogHeader: ({ children }) => <div>{children}</div>,
  DialogTitle: ({ children }) => <h2>{children}</h2>,
  DialogDescription: ({ children, className }) => <p className={className}>{children}</p>,
  DialogFooter: ({ children, className }) => <div className={className}>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, className, ...props }) => (
    <button onClick={onClick} disabled={disabled} className={className} data-variant={variant} {...props}>
      {children}
    </button>
  ),
}));

describe('LinkWalletDialog', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    linkAccountCallbacks = {};
    global.fetch = jest.fn();
    mockGetAccessToken.mockResolvedValue('privy-token');
  });

  it('renders the link-wallet dialog with Connect Wallet and Skip for now when open', () => {
    render(<LinkWalletDialog open={true} onClose={mockOnClose} />);

    expect(screen.getByText('Link your wallet')).toBeInTheDocument();
    expect(screen.getByText(/existing Music Nerd wallet-based account/i)).toBeInTheDocument();
    expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
    expect(screen.getByText('Skip for now')).toBeInTheDocument();
    expect(screen.queryByText('New user')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('does not render when closed', () => {
    render(<LinkWalletDialog open={false} onClose={mockOnClose} />);

    expect(screen.queryByText('Welcome to Music Nerd!')).not.toBeInTheDocument();
  });

  it('calls onClose when "Skip for now" is clicked', () => {
    render(<LinkWalletDialog open={true} onClose={mockOnClose} />);

    fireEvent.click(screen.getByText('Skip for now'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows loading state when connecting wallet', () => {
    render(<LinkWalletDialog open={true} onClose={mockOnClose} />);

    fireEvent.click(screen.getByText('Connect Wallet'));

    expect(screen.getByText('Connecting...')).toBeInTheDocument();
  });

  it('handles successful wallet link (no merge)', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        status: 'ok',
        success: true,
        merged: false,
        message: 'Wallet linked successfully!',
      }),
    });

    render(<LinkWalletDialog open={true} onClose={mockOnClose} />);

    // Simulate Privy onSuccess callback
    await linkAccountCallbacks.onSuccess?.({
      linkedAccount: {
        type: 'wallet',
        address: '0x1234567890abcdef1234567890abcdef12345678',
      },
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('https://musicnerd-api-staging.vercel.app/api/auth/link-wallet', expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer privy-token' }),
        credentials: 'omit',
      }));
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Wallet Linked!',
        })
      );
      expect(mockRefetchAccount).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('handles successful account merge', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        status: 'ok',
        success: true,
        merged: true,
        userId: 'surviving-user',
        message: 'Account merged successfully!',
      }),
    });

    render(<LinkWalletDialog open={true} onClose={mockOnClose} />);

    await linkAccountCallbacks.onSuccess?.({
      linkedAccount: {
        type: 'wallet',
        address: '0x1234567890abcdef1234567890abcdef12345678',
      },
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Account Merged!',
        })
      );
    });
  });

  it('shows error when API returns failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({
        status: 'error',
        error: 'This wallet is already linked to another account',
      }),
    });

    render(<LinkWalletDialog open={true} onClose={mockOnClose} />);

    await linkAccountCallbacks.onSuccess?.({
      linkedAccount: {
        type: 'wallet',
        address: '0x1234567890abcdef1234567890abcdef12345678',
      },
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error',
          description: 'This wallet is already linked to another account',
          variant: 'destructive',
        })
      );
    });
  });

  it('shows an error without calling the API when Privy has no token', async () => {
    mockGetAccessToken.mockResolvedValue(null);

    render(<LinkWalletDialog open={true} onClose={mockOnClose} />);

    await linkAccountCallbacks.onSuccess?.({
      linkedAccount: {
        type: 'wallet',
        address: '0x1234567890abcdef1234567890abcdef12345678',
      },
    });

    await waitFor(() => {
      expect(global.fetch).not.toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error',
          variant: 'destructive',
        })
      );
    });
  });

  it('shows error when fetch throws', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<LinkWalletDialog open={true} onClose={mockOnClose} />);

    await linkAccountCallbacks.onSuccess?.({
      linkedAccount: {
        type: 'wallet',
        address: '0x1234567890abcdef1234567890abcdef12345678',
      },
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error',
          description: 'Failed to link wallet. Please try again.',
          variant: 'destructive',
        })
      );
    });
  });

  it('handles Privy onError callback', async () => {
    render(<LinkWalletDialog open={true} onClose={mockOnClose} />);

    await linkAccountCallbacks.onError?.(new Error('Wallet connection rejected'));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error',
          description: 'Failed to connect wallet. Please try again.',
          variant: 'destructive',
        })
      );
    });
  });

  it('ignores non-wallet linked accounts', async () => {
    render(<LinkWalletDialog open={true} onClose={mockOnClose} />);

    await linkAccountCallbacks.onSuccess?.({
      linkedAccount: {
        type: 'email',
        address: 'test@test.com',
      },
    });

    // fetch should NOT be called for non-wallet types
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('disables all buttons during wallet linking', () => {
    render(<LinkWalletDialog open={true} onClose={mockOnClose} />);

    fireEvent.click(screen.getByText('Connect Wallet'));

    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });
});
