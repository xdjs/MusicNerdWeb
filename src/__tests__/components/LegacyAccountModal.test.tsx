// @ts-nocheck
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Shared mock state
const mockLinkWallet = jest.fn();
let capturedOnSuccess = null;
let capturedOnError = null;
const mockUpdate = jest.fn();
const mockToast = jest.fn();

jest.mock('@privy-io/react-auth', () => ({
  useLinkAccount: (callbacks) => {
    capturedOnSuccess = callbacks?.onSuccess;
    capturedOnError = callbacks?.onError;
    return { linkWallet: mockLinkWallet };
  },
}));

jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { id: 'test-user' } },
    status: 'authenticated',
    update: mockUpdate,
  }),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

const { LegacyAccountModal } = require('@/app/_components/nav/components/LegacyAccountModal');

describe('LegacyAccountModal', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    capturedOnSuccess = null;
    capturedOnError = null;
    (global.fetch as jest.Mock).mockReset();
  });

  it('renders when open', () => {
    render(<LegacyAccountModal open={true} onClose={mockOnClose} />);

    expect(screen.getByText('Welcome to Music Nerd!')).toBeInTheDocument();
    expect(screen.getByText(/existing Music Nerd wallet-based account/i)).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<LegacyAccountModal open={false} onClose={mockOnClose} />);

    expect(screen.queryByText('Welcome to Music Nerd!')).not.toBeInTheDocument();
  });

  it('shows Connect Wallet and Skip buttons', () => {
    render(<LegacyAccountModal open={true} onClose={mockOnClose} />);

    expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
    expect(screen.getByText('Skip for now')).toBeInTheDocument();
  });

  it('calls onClose when Skip is clicked', () => {
    render(<LegacyAccountModal open={true} onClose={mockOnClose} />);

    fireEvent.click(screen.getByText('Skip for now'));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls linkWallet when Connect Wallet is clicked', () => {
    render(<LegacyAccountModal open={true} onClose={mockOnClose} />);

    fireEvent.click(screen.getByText('Connect Wallet'));

    expect(mockLinkWallet).toHaveBeenCalled();
  });

  it('shows Connecting... state while linking', () => {
    render(<LegacyAccountModal open={true} onClose={mockOnClose} />);

    fireEvent.click(screen.getByText('Connect Wallet'));

    expect(screen.getByText('Connecting...')).toBeInTheDocument();
  });

  it('handles successful wallet link with merge', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        merged: true,
        message: 'Account merged successfully!',
      }),
    });

    render(<LegacyAccountModal open={true} onClose={mockOnClose} />);

    // Click to initialize the component and capture callbacks
    fireEvent.click(screen.getByText('Connect Wallet'));

    // Simulate Privy successfully linking a wallet
    await capturedOnSuccess({
      linkedAccount: {
        type: 'wallet',
        address: '0x1234567890abcdef1234567890abcdef12345678',
      },
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Account Merged!',
      }));
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('handles successful wallet link without merge', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        merged: false,
        message: 'Wallet linked successfully!',
      }),
    });

    render(<LegacyAccountModal open={true} onClose={mockOnClose} />);

    fireEvent.click(screen.getByText('Connect Wallet'));

    await capturedOnSuccess({
      linkedAccount: {
        type: 'wallet',
        address: '0x1234567890abcdef1234567890abcdef12345678',
      },
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Wallet Linked!',
      }));
    });
  });

  it('handles API error during wallet link', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: false,
        error: 'Wallet already linked',
      }),
    });

    render(<LegacyAccountModal open={true} onClose={mockOnClose} />);

    fireEvent.click(screen.getByText('Connect Wallet'));

    await capturedOnSuccess({
      linkedAccount: {
        type: 'wallet',
        address: '0x1234567890abcdef1234567890abcdef12345678',
      },
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Error',
        variant: 'destructive',
      }));
    });
  });

  it('handles Privy link error', async () => {
    render(<LegacyAccountModal open={true} onClose={mockOnClose} />);

    fireEvent.click(screen.getByText('Connect Wallet'));

    await capturedOnError(new Error('User rejected'));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Error',
        description: 'Failed to connect wallet. Please try again.',
        variant: 'destructive',
      }));
    });
  });

  it('shows error message in the modal on fetch failure', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<LegacyAccountModal open={true} onClose={mockOnClose} />);

    fireEvent.click(screen.getByText('Connect Wallet'));

    await capturedOnSuccess({
      linkedAccount: {
        type: 'wallet',
        address: '0x1234567890abcdef1234567890abcdef12345678',
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Failed to link wallet. Please try again.')).toBeInTheDocument();
    });
  });
});
