// @ts-nocheck
import { jest } from '@jest/globals';

// Mock modules with jest.fn() inside factory
jest.mock('@/server/utils/privy', () => ({
  verifyPrivyToken: jest.fn(),
}));

jest.mock('@/server/utils/queries/userQueries', () => ({
  getUserByPrivyId: jest.fn(),
  createUserFromPrivy: jest.fn(),
  getUserByWallet: jest.fn(),
}));

// Use require to get the actual mock references (avoids ESM hoisting issues)
const { verifyPrivyToken } = require('@/server/utils/privy');
const { getUserByPrivyId, createUserFromPrivy, getUserByWallet } = require('@/server/utils/queries/userQueries');
const { authOptions } = require('@/server/auth');

describe('auth.ts - Privy credentials provider', () => {
  beforeEach(() => {
    verifyPrivyToken.mockReset();
    getUserByPrivyId.mockReset();
    createUserFromPrivy.mockReset();
    getUserByWallet.mockReset();
  });

  function getPrivyAuthorize() {
    const provider = authOptions.providers.find((p: any) => p.options?.id === 'privy' || p.id === 'privy');
    // CredentialsProvider wraps authorize at the top level; the original is on .options
    return provider.options.authorize;
  }

  describe('authorize', () => {
    it('returns null when no auth token is provided', async () => {
      const authorize = getPrivyAuthorize();
      const result = await authorize({});

      expect(result).toBeNull();
    });

    it('returns null when token verification fails', async () => {
      verifyPrivyToken.mockResolvedValue(null);

      const authorize = getPrivyAuthorize();
      const result = await authorize({ authToken: 'bad-token' });

      expect(verifyPrivyToken).toHaveBeenCalledWith('bad-token');
      expect(result).toBeNull();
    });

    it('returns existing user when found by Privy ID', async () => {
      verifyPrivyToken.mockResolvedValue({
        userId: 'did:privy:existing',
        email: 'existing@test.com',
        linkedAccounts: [],
      });
      getUserByPrivyId.mockResolvedValue({
        id: 'db-user-id',
        privyUserId: 'did:privy:existing',
        email: 'existing@test.com',
        wallet: '0x1234567890abcdef1234567890abcdef12345678',
        isWhiteListed: true,
        isAdmin: false,
        isSuperAdmin: false,
        isHidden: false,
      });

      const authorize = getPrivyAuthorize();
      const result = await authorize({ authToken: 'valid-token' });

      expect(result).toEqual(expect.objectContaining({
        id: 'db-user-id',
        privyUserId: 'did:privy:existing',
        email: 'existing@test.com',
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        isWhiteListed: true,
        needsLegacyLink: false,
      }));
    });

    it('creates new user when not found by Privy ID', async () => {
      verifyPrivyToken.mockResolvedValue({
        userId: 'did:privy:new-user',
        email: 'new@test.com',
        linkedAccounts: [],
      });
      getUserByPrivyId.mockResolvedValue(undefined);
      createUserFromPrivy.mockResolvedValue({
        id: 'new-db-id',
        privyUserId: 'did:privy:new-user',
        email: 'new@test.com',
        wallet: null,
        isWhiteListed: false,
        isAdmin: false,
        isSuperAdmin: false,
        isHidden: false,
      });

      const authorize = getPrivyAuthorize();
      const result = await authorize({ authToken: 'new-user-token' });

      expect(createUserFromPrivy).toHaveBeenCalledWith({
        privyUserId: 'did:privy:new-user',
        email: 'new@test.com',
      });
      expect(result).toEqual(expect.objectContaining({
        id: 'new-db-id',
        privyUserId: 'did:privy:new-user',
        needsLegacyLink: true,
      }));
    });

    it('returns null when user creation fails', async () => {
      verifyPrivyToken.mockResolvedValue({
        userId: 'did:privy:fail',
        email: 'fail@test.com',
        linkedAccounts: [],
      });
      getUserByPrivyId.mockResolvedValue(undefined);
      createUserFromPrivy.mockRejectedValue(new Error('DB error'));

      const authorize = getPrivyAuthorize();
      const result = await authorize({ authToken: 'fail-token' });

      expect(result).toBeNull();
    });

    it('sets needsLegacyLink to true when user has no wallet', async () => {
      verifyPrivyToken.mockResolvedValue({
        userId: 'did:privy:no-wallet',
        email: 'nowallet@test.com',
        linkedAccounts: [],
      });
      getUserByPrivyId.mockResolvedValue({
        id: 'user-no-wallet',
        privyUserId: 'did:privy:no-wallet',
        email: 'nowallet@test.com',
        wallet: null,
        isWhiteListed: false,
        isAdmin: false,
        isSuperAdmin: false,
        isHidden: false,
      });

      const authorize = getPrivyAuthorize();
      const result = await authorize({ authToken: 'no-wallet-token' });

      expect(result.needsLegacyLink).toBe(true);
    });
  });

  describe('jwt callback', () => {
    it('copies user properties to token on sign-in', async () => {
      const user = {
        id: 'user-1',
        privyUserId: 'did:privy:u1',
        walletAddress: '0xabc',
        email: 'jwt@test.com',
        isWhiteListed: true,
        isAdmin: false,
        isSuperAdmin: false,
        isHidden: false,
        needsLegacyLink: false,
      };

      const token = { sub: 'user-1' };
      const result = await authOptions.callbacks.jwt({ token, user, trigger: 'signIn' });

      expect(result.privyUserId).toBe('did:privy:u1');
      expect(result.walletAddress).toBe('0xabc');
      expect(result.email).toBe('jwt@test.com');
      expect(result.isWhiteListed).toBe(true);
      expect(result.needsLegacyLink).toBe(false);
      expect(result.lastRefresh).toBeDefined();
    });

    it('refreshes user data when token is stale', async () => {
      getUserByPrivyId.mockResolvedValue({
        wallet: '0xrefreshed',
        isWhiteListed: true,
        isAdmin: true,
        isSuperAdmin: false,
        isHidden: false,
        email: 'refreshed@test.com',
        username: 'refreshed',
      });

      const staleToken = {
        sub: 'user-stale',
        privyUserId: 'did:privy:u1',
        lastRefresh: Date.now() - 10 * 60 * 1000, // 10 minutes ago
        isAdmin: false,
        isWhiteListed: false,
        isSuperAdmin: false,
        isHidden: false,
      };

      const result = await authOptions.callbacks.jwt({ token: staleToken });

      expect(getUserByPrivyId).toHaveBeenCalledWith('did:privy:u1');
      expect(result.isAdmin).toBe(true);
      expect(result.walletAddress).toBe('0xrefreshed');
    });

    it('skips refresh when token is fresh', async () => {
      const freshToken = {
        sub: 'user-fresh',
        privyUserId: 'did:privy:u1',
        lastRefresh: Date.now() - 1000, // 1 second ago
        isAdmin: false,
        isWhiteListed: false,
        isSuperAdmin: false,
        isHidden: false,
      };

      const result = await authOptions.callbacks.jwt({ token: freshToken });

      expect(getUserByPrivyId).not.toHaveBeenCalled();
      expect(result.isAdmin).toBe(false);
    });

    it('refreshes on explicit update trigger', async () => {
      getUserByPrivyId.mockResolvedValue({
        wallet: '0xupdated',
        isWhiteListed: true,
        isAdmin: false,
        isSuperAdmin: false,
        isHidden: false,
        email: 'updated@test.com',
        username: 'updated',
      });

      const token = {
        sub: 'user-update',
        privyUserId: 'did:privy:u1',
        lastRefresh: Date.now(), // fresh
        isAdmin: false,
        isWhiteListed: false,
        isSuperAdmin: false,
        isHidden: false,
      };

      const result = await authOptions.callbacks.jwt({ token, trigger: 'update' });

      expect(getUserByPrivyId).toHaveBeenCalled();
      expect(result.walletAddress).toBe('0xupdated');
    });

    it('falls back to getUserByWallet when no privyUserId', async () => {
      getUserByWallet.mockResolvedValue({
        wallet: '0xwallet-refresh',
        isWhiteListed: false,
        isAdmin: false,
        isSuperAdmin: false,
        isHidden: false,
        email: 'wallet@test.com',
        username: 'walletuser',
      });

      const token = {
        sub: 'user-wallet',
        walletAddress: '0xwallet-refresh',
        lastRefresh: Date.now() - 10 * 60 * 1000, // stale
        isAdmin: undefined, // missing - triggers refresh
      };

      const result = await authOptions.callbacks.jwt({ token });

      expect(getUserByWallet).toHaveBeenCalledWith('0xwallet-refresh');
    });
  });

  describe('session callback', () => {
    it('maps token properties to session user', async () => {
      const session = { user: {}, expires: '2030-01-01' };
      const token = {
        sub: 'user-1',
        privyUserId: 'did:privy:s1',
        walletAddress: '0xsession',
        email: 'session@test.com',
        name: 'Session User',
        isWhiteListed: true,
        isAdmin: true,
        isSuperAdmin: false,
        isHidden: false,
        needsLegacyLink: false,
      };

      const result = await authOptions.callbacks.session({ session, token });

      expect(result.user).toEqual(expect.objectContaining({
        id: 'user-1',
        privyUserId: 'did:privy:s1',
        walletAddress: '0xsession',
        email: 'session@test.com',
        isAdmin: true,
        needsLegacyLink: false,
      }));
    });
  });

  describe('redirect callback', () => {
    it('allows relative URLs', async () => {
      const result = await authOptions.callbacks.redirect({
        url: '/profile',
        baseUrl: 'https://musicnerd.xyz',
      });
      expect(result).toBe('https://musicnerd.xyz/profile');
    });

    it('allows same-origin URLs', async () => {
      const result = await authOptions.callbacks.redirect({
        url: 'https://musicnerd.xyz/admin',
        baseUrl: 'https://musicnerd.xyz',
      });
      expect(result).toBe('https://musicnerd.xyz/admin');
    });

    it('blocks cross-origin URLs', async () => {
      const result = await authOptions.callbacks.redirect({
        url: 'https://evil.com/phish',
        baseUrl: 'https://musicnerd.xyz',
      });
      expect(result).toBe('https://musicnerd.xyz');
    });
  });
});
