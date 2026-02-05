// @ts-nocheck
import { jest } from '@jest/globals';

// Mock the Privy server-auth module
jest.mock('@privy-io/server-auth', () => {
  const mockVerifyAuthToken = jest.fn();
  const mockGetUser = jest.fn();
  return {
    PrivyClient: jest.fn().mockImplementation(() => ({
      verifyAuthToken: mockVerifyAuthToken,
      getUser: mockGetUser,
    })),
    __mockVerifyAuthToken: mockVerifyAuthToken,
    __mockGetUser: mockGetUser,
  };
});

// Mock env variables
jest.mock('@/env', () => ({
  PRIVY_APP_ID: 'test-app-id',
  PRIVY_APP_SECRET: 'test-app-secret',
}));

describe('verifyPrivyToken', () => {
  let verifyPrivyToken: typeof import('@/server/utils/privy').verifyPrivyToken;
  let getPrivyUser: typeof import('@/server/utils/privy').getPrivyUser;
  let mockVerifyAuthToken: jest.Mock;
  let mockGetUser: jest.Mock;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(async () => {
    jest.resetModules();

    // Re-import to get fresh module with fresh mocks
    const privyServerAuth = await import('@privy-io/server-auth');
    mockVerifyAuthToken = (privyServerAuth as any).__mockVerifyAuthToken;
    mockGetUser = (privyServerAuth as any).__mockGetUser;

    mockVerifyAuthToken.mockReset();
    mockGetUser.mockReset();

    const privyModule = await import('@/server/utils/privy');
    verifyPrivyToken = privyModule.verifyPrivyToken;
    getPrivyUser = privyModule.getPrivyUser;
  });

  afterEach(() => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, writable: true });
  });

  describe('access token flow', () => {
    it('verifies a standard access token and returns user data', async () => {
      mockVerifyAuthToken.mockResolvedValue({ userId: 'did:privy:abc123' });
      mockGetUser.mockResolvedValue({
        id: 'did:privy:abc123',
        email: { address: 'test@example.com' },
        linkedAccounts: [
          { type: 'email', address: 'test@example.com' },
        ],
      });

      const result = await verifyPrivyToken('valid-access-token');

      expect(mockVerifyAuthToken).toHaveBeenCalledWith('valid-access-token');
      expect(mockGetUser).toHaveBeenCalledWith('did:privy:abc123');
      expect(result).toEqual({
        userId: 'did:privy:abc123',
        email: 'test@example.com',
        linkedAccounts: [
          { type: 'email', address: undefined, email: 'test@example.com' },
        ],
      });
    });

    it('returns null when access token verification fails', async () => {
      mockVerifyAuthToken.mockRejectedValue(new Error('Invalid token'));

      const result = await verifyPrivyToken('invalid-token');

      expect(result).toBeNull();
    });

    it('maps wallet linked accounts correctly', async () => {
      mockVerifyAuthToken.mockResolvedValue({ userId: 'did:privy:abc123' });
      mockGetUser.mockResolvedValue({
        id: 'did:privy:abc123',
        email: { address: 'user@test.com' },
        linkedAccounts: [
          { type: 'wallet', address: '0x1234567890abcdef1234567890abcdef12345678' },
          { type: 'email', address: 'user@test.com' },
        ],
      });

      const result = await verifyPrivyToken('valid-token');

      expect(result?.linkedAccounts).toEqual([
        { type: 'wallet', address: '0x1234567890abcdef1234567890abcdef12345678', email: undefined },
        { type: 'email', address: undefined, email: 'user@test.com' },
      ]);
    });
  });

  describe('identity token flow', () => {
    it('verifies an identity token prefixed with "idtoken:"', async () => {
      mockGetUser.mockResolvedValue({
        id: 'did:privy:id-user',
        email: { address: 'id@example.com' },
        linkedAccounts: [],
      });

      const result = await verifyPrivyToken('idtoken:some-identity-token');

      expect(mockVerifyAuthToken).not.toHaveBeenCalled();
      expect(mockGetUser).toHaveBeenCalledWith({ idToken: 'some-identity-token' });
      expect(result).toEqual({
        userId: 'did:privy:id-user',
        email: 'id@example.com',
        linkedAccounts: [],
      });
    });

    it('returns null when identity token verification fails', async () => {
      mockGetUser.mockRejectedValue(new Error('Invalid identity token'));

      const result = await verifyPrivyToken('idtoken:bad-token');

      expect(result).toBeNull();
    });
  });

  describe('direct Privy ID flow', () => {
    it('allows direct Privy ID in development', async () => {
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });

      // Re-import to pick up new NODE_ENV
      jest.resetModules();
      const privyServerAuth = await import('@privy-io/server-auth');
      mockGetUser = (privyServerAuth as any).__mockGetUser;
      mockGetUser.mockReset();

      const { verifyPrivyToken: devVerify } = await import('@/server/utils/privy');

      mockGetUser.mockResolvedValue({
        id: 'did:privy:direct-user',
        email: { address: 'direct@example.com' },
        linkedAccounts: [],
      });

      const result = await devVerify('privyid:did:privy:direct-user');

      expect(mockGetUser).toHaveBeenCalledWith('did:privy:direct-user');
      expect(result).toEqual({
        userId: 'did:privy:direct-user',
        email: 'direct@example.com',
        linkedAccounts: [],
      });
    });

    it('rejects direct Privy ID in production', async () => {
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });

      jest.resetModules();
      const { verifyPrivyToken: prodVerify } = await import('@/server/utils/privy');

      const result = await prodVerify('privyid:did:privy:direct-user');

      expect(result).toBeNull();
    });
  });

  describe('user with no email', () => {
    it('returns undefined email when user has no email', async () => {
      mockVerifyAuthToken.mockResolvedValue({ userId: 'did:privy:no-email' });
      mockGetUser.mockResolvedValue({
        id: 'did:privy:no-email',
        email: undefined,
        linkedAccounts: [{ type: 'wallet', address: '0xabc' }],
      });

      const result = await verifyPrivyToken('token-no-email');

      expect(result?.email).toBeUndefined();
      expect(result?.userId).toBe('did:privy:no-email');
    });
  });

  describe('getPrivyUser', () => {
    it('returns user data from Privy API', async () => {
      mockGetUser.mockResolvedValue({
        id: 'did:privy:user1',
        email: { address: 'user@test.com' },
      });

      const result = await getPrivyUser('did:privy:user1');

      expect(mockGetUser).toHaveBeenCalledWith('did:privy:user1');
      expect(result?.id).toBe('did:privy:user1');
    });

    it('returns null when Privy API call fails', async () => {
      mockGetUser.mockRejectedValue(new Error('API error'));

      const result = await getPrivyUser('did:privy:bad');

      expect(result).toBeNull();
    });
  });
});
