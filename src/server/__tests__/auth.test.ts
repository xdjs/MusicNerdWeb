// @ts-nocheck

import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('@/server/utils/privy', () => ({
  verifyPrivyToken: jest.fn(),
}));

jest.mock('@/server/utils/queries/userQueries', () => ({
  getUserByPrivyId: jest.fn(),
  createUserFromPrivy: jest.fn(),
  getUserByWallet: jest.fn(),
  backfillUsernameFromEmail: jest.fn(),
}));

const mockDbUser = {
  id: 'db-user-uuid',
  privyUserId: 'did:privy:user123',
  email: 'user@example.com',
  wallet: '0x1234567890abcdef1234567890abcdef12345678',
  username: 'testuser',
  isWhiteListed: true,
  isAdmin: false,
  isSuperAdmin: false,
  isHidden: false,
};

const mockDbUserNoWallet = {
  ...mockDbUser,
  wallet: null,
};

// Helper to get fresh mocks and authOptions
async function setup() {
  const { verifyPrivyToken } = await import('@/server/utils/privy');
  const { getUserByPrivyId, createUserFromPrivy, getUserByWallet, backfillUsernameFromEmail } = await import(
    '@/server/utils/queries/userQueries'
  );
  const { authOptions } = await import('@/server/auth');

  return {
    authOptions,
    mockVerifyPrivyToken: verifyPrivyToken as jest.Mock,
    mockGetUserByPrivyId: getUserByPrivyId as jest.Mock,
    mockCreateUserFromPrivy: createUserFromPrivy as jest.Mock,
    mockGetUserByWallet: getUserByWallet as jest.Mock,
    mockBackfillUsernameFromEmail: backfillUsernameFromEmail as jest.Mock,
  };
}

// Helper to access the Privy credentials provider's authorize function
function getAuthorize(authOptions: any) {
  const privyProvider = authOptions.providers.find(
    (p: any) => p.options?.id === 'privy' || p.id === 'privy'
  );
  return (privyProvider as any).options?.authorize || (privyProvider as any).authorize;
}

describe('Auth - Privy Credentials Provider', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  describe('authorize()', () => {
    it('returns null when no credentials provided', async () => {
      const { authOptions } = await setup();
      const authorize = getAuthorize(authOptions);
      const result = await authorize(null);
      expect(result).toBeNull();
    });

    it('returns null when authToken is empty', async () => {
      const { authOptions } = await setup();
      const authorize = getAuthorize(authOptions);
      const result = await authorize({ authToken: '' });
      expect(result).toBeNull();
    });

    it('returns null when Privy token verification fails', async () => {
      const { authOptions, mockVerifyPrivyToken } = await setup();
      mockVerifyPrivyToken.mockResolvedValue(null);

      const authorize = getAuthorize(authOptions);
      const result = await authorize({ authToken: 'invalid-token' });

      expect(mockVerifyPrivyToken).toHaveBeenCalledWith('invalid-token');
      expect(result).toBeNull();
    });

    it('returns existing user when found by Privy ID', async () => {
      const { authOptions, mockVerifyPrivyToken, mockGetUserByPrivyId, mockCreateUserFromPrivy } =
        await setup();
      mockVerifyPrivyToken.mockResolvedValue({
        userId: 'did:privy:user123',
        email: 'user@example.com',
        linkedAccounts: [],
      });
      mockGetUserByPrivyId.mockResolvedValue(mockDbUser);

      const authorize = getAuthorize(authOptions);
      const result = await authorize({ authToken: 'valid-token' });

      expect(mockGetUserByPrivyId).toHaveBeenCalledWith('did:privy:user123');
      expect(mockCreateUserFromPrivy).not.toHaveBeenCalled();
      expect(result).toEqual({
        id: 'db-user-uuid',
        privyUserId: 'did:privy:user123',
        email: 'user@example.com',
        username: 'testuser',
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        isWhiteListed: true,
        isAdmin: false,
        isSuperAdmin: false,
        isHidden: false,
        isSignupComplete: true,
        needsLegacyLink: false,
      });
    });

    it('creates new user when not found by Privy ID', async () => {
      const { authOptions, mockVerifyPrivyToken, mockGetUserByPrivyId, mockCreateUserFromPrivy } =
        await setup();
      mockVerifyPrivyToken.mockResolvedValue({
        userId: 'did:privy:newuser',
        email: 'new@example.com',
        linkedAccounts: [],
      });
      mockGetUserByPrivyId.mockResolvedValue(undefined);
      mockCreateUserFromPrivy.mockResolvedValue({
        ...mockDbUserNoWallet,
        id: 'new-user-uuid',
        privyUserId: 'did:privy:newuser',
        email: 'new@example.com',
        isWhiteListed: false,
        isAdmin: false,
        isSuperAdmin: false,
        isHidden: false,
      });

      const authorize = getAuthorize(authOptions);
      const result = await authorize({ authToken: 'valid-token' });

      expect(mockCreateUserFromPrivy).toHaveBeenCalledWith({
        privyUserId: 'did:privy:newuser',
        email: 'new@example.com',
      });
      expect(result).not.toBeNull();
      expect(result.id).toBe('new-user-uuid');
    });

    it('returns null when createUserFromPrivy fails', async () => {
      const { authOptions, mockVerifyPrivyToken, mockGetUserByPrivyId, mockCreateUserFromPrivy } =
        await setup();
      mockVerifyPrivyToken.mockResolvedValue({
        userId: 'did:privy:newuser',
        email: 'new@example.com',
        linkedAccounts: [],
      });
      mockGetUserByPrivyId.mockResolvedValue(undefined);
      mockCreateUserFromPrivy.mockRejectedValue(new Error('DB insert failed'));

      const authorize = getAuthorize(authOptions);
      const result = await authorize({ authToken: 'valid-token' });

      expect(result).toBeNull();
    });

    it('sets needsLegacyLink to true when user has no wallet', async () => {
      const { authOptions, mockVerifyPrivyToken, mockGetUserByPrivyId } = await setup();
      mockVerifyPrivyToken.mockResolvedValue({
        userId: 'did:privy:user123',
        email: 'user@example.com',
        linkedAccounts: [],
      });
      mockGetUserByPrivyId.mockResolvedValue(mockDbUserNoWallet);

      const authorize = getAuthorize(authOptions);
      const result = await authorize({ authToken: 'valid-token' });

      expect(result.needsLegacyLink).toBe(true);
    });

    it('sets needsLegacyLink to false when user has a wallet', async () => {
      const { authOptions, mockVerifyPrivyToken, mockGetUserByPrivyId } = await setup();
      mockVerifyPrivyToken.mockResolvedValue({
        userId: 'did:privy:user123',
        email: 'user@example.com',
        linkedAccounts: [],
      });
      mockGetUserByPrivyId.mockResolvedValue(mockDbUser);

      const authorize = getAuthorize(authOptions);
      const result = await authorize({ authToken: 'valid-token' });

      expect(result.needsLegacyLink).toBe(false);
    });

    it('backfills username from email when user has no username', async () => {
      const { authOptions, mockVerifyPrivyToken, mockGetUserByPrivyId, mockBackfillUsernameFromEmail } =
        await setup();
      mockVerifyPrivyToken.mockResolvedValue({
        userId: 'did:privy:user123',
        email: 'user@example.com',
        linkedAccounts: [],
      });
      mockGetUserByPrivyId.mockResolvedValue({
        ...mockDbUser,
        username: null,
      });

      const authorize = getAuthorize(authOptions);
      const result = await authorize({ authToken: 'valid-token' });

      expect(mockBackfillUsernameFromEmail).toHaveBeenCalledWith('db-user-uuid', 'user@example.com');
      expect(result.username).toBe('user@example.com');
    });

    it('does not backfill username when user already has one', async () => {
      const { authOptions, mockVerifyPrivyToken, mockGetUserByPrivyId, mockBackfillUsernameFromEmail } =
        await setup();
      mockVerifyPrivyToken.mockResolvedValue({
        userId: 'did:privy:user123',
        email: 'user@example.com',
        linkedAccounts: [],
      });
      mockGetUserByPrivyId.mockResolvedValue(mockDbUser);

      const authorize = getAuthorize(authOptions);
      const result = await authorize({ authToken: 'valid-token' });

      expect(mockBackfillUsernameFromEmail).not.toHaveBeenCalled();
      expect(result.username).toBe('testuser');
    });

    it('does not backfill username when user has no email', async () => {
      const { authOptions, mockVerifyPrivyToken, mockGetUserByPrivyId, mockBackfillUsernameFromEmail } =
        await setup();
      mockVerifyPrivyToken.mockResolvedValue({
        userId: 'did:privy:user123',
        email: undefined,
        linkedAccounts: [],
      });
      mockGetUserByPrivyId.mockResolvedValue({
        ...mockDbUser,
        username: null,
        email: null,
      });

      const authorize = getAuthorize(authOptions);
      const result = await authorize({ authToken: 'valid-token' });

      expect(mockBackfillUsernameFromEmail).not.toHaveBeenCalled();
      expect(result.username).toBeNull();
    });
  });
});

describe('Auth - JWT Callback', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('copies all user properties to token on initial sign-in', async () => {
    const { authOptions } = await setup();
    const jwtCallback = authOptions.callbacks.jwt;

    const user = {
      id: 'user-uuid',
      privyUserId: 'did:privy:user123',
      walletAddress: '0xabc',
      email: 'user@example.com',
      name: 'Test User',
      isWhiteListed: true,
      isAdmin: false,
      isSuperAdmin: false,
      isHidden: false,
      needsLegacyLink: false,
    };

    const token = { sub: 'user-uuid' };
    const result = await jwtCallback({ token, user, trigger: 'signIn' });

    expect(result.privyUserId).toBe('did:privy:user123');
    expect(result.walletAddress).toBe('0xabc');
    expect(result.email).toBe('user@example.com');
    expect(result.isWhiteListed).toBe(true);
    expect(result.isAdmin).toBe(false);
    expect(result.isSuperAdmin).toBe(false);
    expect(result.isHidden).toBe(false);
    expect(result.needsLegacyLink).toBe(false);
    expect(result.lastRefresh).toBeDefined();
  });

  it('does NOT refresh from DB when token is recent (< 5 min)', async () => {
    const { authOptions, mockGetUserByPrivyId, mockGetUserByWallet } = await setup();
    const jwtCallback = authOptions.callbacks.jwt;

    const token = {
      sub: 'user-uuid',
      privyUserId: 'did:privy:user123',
      isAdmin: false,
      isWhiteListed: false,
      isSuperAdmin: false,
      isHidden: false,
      lastRefresh: Date.now(),
    };

    await jwtCallback({ token });

    expect(mockGetUserByPrivyId).not.toHaveBeenCalled();
    expect(mockGetUserByWallet).not.toHaveBeenCalled();
  });

  it('refreshes from DB when token is older than 5 minutes', async () => {
    const { authOptions, mockGetUserByPrivyId } = await setup();
    const jwtCallback = authOptions.callbacks.jwt;
    mockGetUserByPrivyId.mockResolvedValue(mockDbUser);

    const token = {
      sub: 'user-uuid',
      privyUserId: 'did:privy:user123',
      isAdmin: false,
      isWhiteListed: false,
      isSuperAdmin: false,
      isHidden: false,
      lastRefresh: Date.now() - 6 * 60 * 1000,
    };

    const result = await jwtCallback({ token });

    expect(mockGetUserByPrivyId).toHaveBeenCalledWith('did:privy:user123');
    expect(result.isWhiteListed).toBe(true);
  });

  it('refreshes from DB on explicit update trigger', async () => {
    const { authOptions, mockGetUserByPrivyId } = await setup();
    const jwtCallback = authOptions.callbacks.jwt;
    mockGetUserByPrivyId.mockResolvedValue(mockDbUser);

    const token = {
      sub: 'user-uuid',
      privyUserId: 'did:privy:user123',
      isAdmin: false,
      isWhiteListed: false,
      isSuperAdmin: false,
      isHidden: false,
      lastRefresh: Date.now(),
    };

    await jwtCallback({ token, trigger: 'update' });

    expect(mockGetUserByPrivyId).toHaveBeenCalled();
  });

  it('refreshes from DB when critical properties are missing', async () => {
    const { authOptions, mockGetUserByPrivyId } = await setup();
    const jwtCallback = authOptions.callbacks.jwt;
    mockGetUserByPrivyId.mockResolvedValue(mockDbUser);

    const token = {
      sub: 'user-uuid',
      privyUserId: 'did:privy:user123',
      lastRefresh: Date.now(),
      // isAdmin, isWhiteListed, etc. are undefined
    };

    await jwtCallback({ token });

    expect(mockGetUserByPrivyId).toHaveBeenCalled();
  });

  it('falls back to wallet lookup when no privyUserId', async () => {
    const { authOptions, mockGetUserByPrivyId, mockGetUserByWallet } = await setup();
    const jwtCallback = authOptions.callbacks.jwt;
    mockGetUserByWallet.mockResolvedValue(mockDbUser);

    const token = {
      sub: 'user-uuid',
      walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
      lastRefresh: Date.now() - 6 * 60 * 1000,
      isAdmin: false,
      isWhiteListed: false,
      isSuperAdmin: false,
      isHidden: false,
    };

    await jwtCallback({ token });

    expect(mockGetUserByPrivyId).not.toHaveBeenCalled();
    expect(mockGetUserByWallet).toHaveBeenCalledWith(
      '0x1234567890abcdef1234567890abcdef12345678'
    );
  });

  it('updates needsLegacyLink based on wallet presence during refresh', async () => {
    const { authOptions, mockGetUserByPrivyId } = await setup();
    const jwtCallback = authOptions.callbacks.jwt;
    mockGetUserByPrivyId.mockResolvedValue(mockDbUserNoWallet);

    const token = {
      sub: 'user-uuid',
      privyUserId: 'did:privy:user123',
      lastRefresh: Date.now() - 6 * 60 * 1000,
      isAdmin: false,
      isWhiteListed: false,
      isSuperAdmin: false,
      isHidden: false,
    };

    const result = await jwtCallback({ token });

    expect(result.needsLegacyLink).toBe(true);
  });

  it('handles DB errors gracefully during refresh', async () => {
    const { authOptions, mockGetUserByPrivyId } = await setup();
    const jwtCallback = authOptions.callbacks.jwt;
    mockGetUserByPrivyId.mockRejectedValue(new Error('DB down'));

    const token = {
      sub: 'user-uuid',
      privyUserId: 'did:privy:user123',
      isAdmin: false,
      isWhiteListed: false,
      isSuperAdmin: false,
      isHidden: false,
      lastRefresh: Date.now() - 6 * 60 * 1000,
    };

    const result = await jwtCallback({ token });
    expect(result.sub).toBe('user-uuid');
  });
});

describe('Auth - Session Callback', () => {
  it('maps all token fields to session.user', async () => {
    const { authOptions } = await setup();
    const sessionCallback = authOptions.callbacks.session;

    const token = {
      sub: 'user-uuid',
      privyUserId: 'did:privy:user123',
      walletAddress: '0xabc',
      email: 'user@example.com',
      name: 'Test User',
      isWhiteListed: true,
      isAdmin: false,
      isSuperAdmin: false,
      isHidden: false,
      needsLegacyLink: false,
    };

    const session = {
      user: {},
      expires: '2025-12-31T00:00:00.000Z',
    };

    const result = await sessionCallback({ session, token });

    expect(result.user).toEqual({
      id: 'user-uuid',
      privyUserId: 'did:privy:user123',
      walletAddress: '0xabc',
      email: 'user@example.com',
      name: 'Test User',
      isWhiteListed: true,
      isAdmin: false,
      isSuperAdmin: false,
      isHidden: false,
      needsLegacyLink: false,
    });
  });
});
