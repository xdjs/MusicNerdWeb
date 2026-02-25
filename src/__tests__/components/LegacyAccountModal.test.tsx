// @ts-nocheck

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LegacyAccountModal } from '@/app/_components/nav/components/LegacyAccountModal';

// Track callback refs so tests can invoke them
let linkAccountCallbacks: { onSuccess?: Function; onError?: Function } = {};

jest.mock('@privy-io/react-auth', () => ({
  useLinkAccount: (opts) => {
    linkAccountCallbacks = opts || {};
    return {
      linkWallet: jest.fn(),
    };
  },
}));

const mockUpdateSession = jest.fn();
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { id: 'test-user' } },
    status: 'authenticated',
    update: mockUpdateSession,
  }),
}));

// Mock the toast hook
const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock the dismissLegacyLink server action
const mockDismissLegacyLink = jest.fn();
jest.mock('@/app/actions/dismissLegacyLink', () => ({
  dismissLegacyLink: (...args) => mockDismissLegacyLink(...args),
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

describe('LegacyAccountModal', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    linkAccountCallbacks = {};
    global.fetch = jest.fn();
    mockDismissLegacyLink.mockReset();
  });

  it('renders dialog with all three buttons when open', () => {
    render(<LegacyAccountModal open={true} onClose={mockOnClose} />);

    expect(screen.getByText('Welcome to Music Nerd!')).toBeInTheDocument();
    expect(screen.getByText(/existing Music Nerd wallet-based account/i)).toBeInTheDocument();
    expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
    expect(screen.getByText('Skip for now')).toBeInTheDocument();
    expect(screen.getByText("New user")).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<LegacyAccountModal open={false} onClose={mockOnClose} />);

    expect(screen.queryByText('Welcome to Music Nerd!')).not.toBeInTheDocument();
  });

  it('calls onClose when "Skip for now" is clicked', () => {
    render(<LegacyAccountModal open={true} onClose={mockOnClose} />);

    fireEvent.click(screen.getByText('Skip for now'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows loading state when connecting wallet', () => {
    render(<LegacyAccountModal open={true} onClose={mockOnClose} />);

    fireEvent.click(screen.getByText('Connect Wallet'));

    expect(screen.getByText('Connecting...')).toBeInTheDocument();
  });

  it('handles successful wallet link (no merge)', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        merged: false,
        message: 'Wallet linked successfully!',
      }),
    });

    render(<LegacyAccountModal open={true} onClose={mockOnClose} />);

    // Simulate Privy onSuccess callback
    await linkAccountCallbacks.onSuccess?.({
      linkedAccount: {
        type: 'wallet',
        address: '0x1234567890abcdef1234567890abcdef12345678',
      },
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/link-wallet', expect.objectContaining({
        method: 'POST',
      }));
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Wallet Linked!',
        })
      );
      expect(mockUpdateSession).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('handles successful account merge', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        merged: true,
        message: 'Account merged successfully!',
      }),
    });

    render(<LegacyAccountModal open={true} onClose={mockOnClose} />);

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
        success: false,
        error: 'This wallet is already linked to another account',
      }),
    });

    render(<LegacyAccountModal open={true} onClose={mockOnClose} />);

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
          variant: 'destructive',
        })
      );
    });
  });

  it('shows error when fetch throws', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<LegacyAccountModal open={true} onClose={mockOnClose} />);

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
    render(<LegacyAccountModal open={true} onClose={mockOnClose} />);

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
    render(<LegacyAccountModal open={true} onClose={mockOnClose} />);

    await linkAccountCallbacks.onSuccess?.({
      linkedAccount: {
        type: 'email',
        address: 'test@test.com',
      },
    });

    // fetch should NOT be called for non-wallet types
    expect(global.fetch).not.toHaveBeenCalled();
  });

  // Dismiss button tests
  describe('dismiss button', () => {
    it('calls dismissLegacyLink and closes modal on success', async () => {
      mockDismissLegacyLink.mockResolvedValue({ success: true });

      render(<LegacyAccountModal open={true} onClose={mockOnClose} />);

      fireEvent.click(screen.getByText("New user"));

      await waitFor(() => {
        expect(mockDismissLegacyLink).toHaveBeenCalled();
        expect(mockUpdateSession).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('shows error when dismiss fails', async () => {
      mockDismissLegacyLink.mockResolvedValue({ success: false, error: 'Server error' });

      render(<LegacyAccountModal open={true} onClose={mockOnClose} />);

      fireEvent.click(screen.getByText("New user"));

      await waitFor(() => {
        expect(mockDismissLegacyLink).toHaveBeenCalled();
        expect(mockOnClose).not.toHaveBeenCalled();
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Error',
            variant: 'destructive',
          })
        );
      });
    });

    it('shows loading state during dismiss', async () => {
      // Make the promise hang so we can check loading state
      let resolvePromise: (value: { success: boolean }) => void;
      mockDismissLegacyLink.mockReturnValue(new Promise((resolve) => { resolvePromise = resolve; }));

      render(<LegacyAccountModal open={true} onClose={mockOnClose} />);

      fireEvent.click(screen.getByText("New user"));

      expect(screen.getByText('Dismissing...')).toBeInTheDocument();

      // All buttons should be disabled during dismiss
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toBeDisabled();
      });

      // Resolve to clean up
      resolvePromise({ success: true });
    });

    it('disables all buttons during wallet linking', () => {
      render(<LegacyAccountModal open={true} onClose={mockOnClose} />);

      fireEvent.click(screen.getByText('Connect Wallet'));

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });
  });
});
