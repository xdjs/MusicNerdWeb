import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

// ---- Mutable mock state ----

const mockRefetch = jest.fn();
let mockAccount: Record<string, unknown> | null = null;
let mockAccountStatus = 'unauthenticated';
let mockIsError = false;

jest.mock('@/hooks/useMusicNerdUser', () => ({
  useMusicNerdUser: () => ({ user: mockAccount, status: mockAccountStatus, isError: mockIsError, refetch: mockRefetch }),
}));

// Mock child components so the test focuses on ClientWrapper logic
jest.mock('../LiveUserProfile', () => {
  return {
    __esModule: true,
    default: ({ user }: { user: { id: string; username?: string | null } }) => (
      <div data-testid="dashboard" data-user-id={user.id} data-username={user.username}>
        Dashboard: {user.username || user.id}
      </div>
    ),
  };
});

import ClientWrapper from '../ClientWrapper';

const mockUserData = {
  id: 'user-123',
  wallet: '0xabc',
  email: 'test@example.com',
  username: 'testuser',
  privyUserId: 'privy-1',
  isAdmin: false,
  isWhiteListed: true,
  isSuperAdmin: false,
  isHidden: false,
  acceptedUgcCount: 5,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-06-01T00:00:00.000Z',
  legacyId: null,
  needsLegacyLink: false,
};

describe('ClientWrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAccount = null;
    mockAccountStatus = 'unauthenticated';
    mockIsError = false;
  });

  it('renders the profile for the signed-in account', () => {
    mockAccount = mockUserData;
    mockAccountStatus = 'authenticated';
    render(<ClientWrapper />);
    expect(screen.getByTestId('dashboard')).toHaveAttribute('data-user-id', 'user-123');
    expect(screen.getByTestId('dashboard')).toHaveAttribute('data-username', 'testuser');
  });

  it('asks anonymous visitors to log in without creating a guest account', () => {
    render(<ClientWrapper />);
    expect(screen.getByText('Your MusicNerd starts here')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument();
  });

  it('offers a retry when the account could not load', () => {
    mockIsError = true;
    render(<ClientWrapper />);
    expect(screen.getByRole('alert')).toHaveTextContent('Your profile couldn’t load.');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(mockRefetch).toHaveBeenCalled();
    expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument();
  });

  it('shows loading while the account is loading', () => {
    mockAccountStatus = 'loading';
    render(<ClientWrapper />);
    expect(screen.getByRole('status', { name: 'Loading profile' })).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument();
  });
});
