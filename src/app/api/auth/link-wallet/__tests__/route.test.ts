// @ts-nocheck

import { jest } from '@jest/globals';

// Mock modules at the top level - these will be used with dynamic imports
jest.mock('@/server/auth', () => ({
  getServerAuthSession: jest.fn(),
}));

jest.mock('@/server/utils/queries/userQueries', () => ({
  getUserByWallet: jest.fn(),
  linkWalletToUser: jest.fn(),
  mergeAccounts: jest.fn(),
}));

// Polyfill Response.json for test environment
if (!('json' in Response)) {
  Response.json = (data, init) =>
    new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
      status: init?.status || 200,
    });
}

const validWallet = '0x1234567890abcdef1234567890abcdef12345678';

const createRequest = (body?: any) =>
  new Request('http://localhost/api/auth/link-wallet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : 'invalid-json{',
  });

const authenticatedSession = {
  user: {
    id: 'user-uuid',
    privyUserId: 'did:privy:user123',
    email: 'test@test.com',
  },
  expires: '2025-12-31',
};

describe('POST /api/auth/link-wallet', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  // Helper to get freshly imported mocks and route handler
  async function setup() {
    const { getServerAuthSession } = await import('@/server/auth');
    const { getUserByWallet, linkWalletToUser, mergeAccounts } = await import(
      '@/server/utils/queries/userQueries'
    );
    const { POST } = await import('../route');

    return {
      POST,
      mockGetSession: getServerAuthSession as jest.Mock,
      mockGetUserByWallet: getUserByWallet as jest.Mock,
      mockLinkWalletToUser: linkWalletToUser as jest.Mock,
      mockMergeAccounts: mergeAccounts as jest.Mock,
    };
  }

  describe('Authentication', () => {
    it('returns 401 when no session', async () => {
      const { POST, mockGetSession } = await setup();
      mockGetSession.mockResolvedValue(null);

      const response = await POST(createRequest({ walletAddress: validWallet }));

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Not authenticated');
    });

    it('returns 401 when session has no user id', async () => {
      const { POST, mockGetSession } = await setup();
      mockGetSession.mockResolvedValue({ user: { privyUserId: 'did:privy:x' } });

      const response = await POST(createRequest({ walletAddress: validWallet }));
      expect(response.status).toBe(401);
    });

    it('returns 401 when session has no privyUserId', async () => {
      const { POST, mockGetSession } = await setup();
      mockGetSession.mockResolvedValue({ user: { id: 'uuid' } });

      const response = await POST(createRequest({ walletAddress: validWallet }));
      expect(response.status).toBe(401);
    });
  });

  describe('Validation', () => {
    it('returns 400 for invalid JSON body', async () => {
      const { POST, mockGetSession } = await setup();
      mockGetSession.mockResolvedValue(authenticatedSession);

      const request = new Request('http://localhost/api/auth/link-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not valid json',
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid request body');
    });

    it('returns 400 when walletAddress is missing', async () => {
      const { POST, mockGetSession } = await setup();
      mockGetSession.mockResolvedValue(authenticatedSession);

      const response = await POST(createRequest({}));
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid wallet address');
    });

    it('returns 400 when walletAddress is invalid format', async () => {
      const { POST, mockGetSession } = await setup();
      mockGetSession.mockResolvedValue(authenticatedSession);

      const response = await POST(createRequest({ walletAddress: 'not-a-wallet' }));
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid wallet address');
    });

    it('returns 400 for wallet address that is too short', async () => {
      const { POST, mockGetSession } = await setup();
      mockGetSession.mockResolvedValue(authenticatedSession);

      const response = await POST(createRequest({ walletAddress: '0x123' }));
      expect(response.status).toBe(400);
    });
  });

  describe('Legacy user merge', () => {
    it('merges when legacy user found without privyUserId', async () => {
      const { POST, mockGetSession, mockGetUserByWallet, mockMergeAccounts } = await setup();
      mockGetSession.mockResolvedValue(authenticatedSession);

      const legacyUser = { id: 'legacy-uuid', wallet: validWallet, privyUserId: null };
      mockGetUserByWallet.mockResolvedValue(legacyUser);
      mockMergeAccounts.mockResolvedValue({ success: true });

      const response = await POST(createRequest({ walletAddress: validWallet }));
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.merged).toBe(true);
      expect(data.message).toContain('merged');
      expect(mockMergeAccounts).toHaveBeenCalledWith('user-uuid', 'legacy-uuid');
    });

    it('returns 409 when wallet is already linked to another Privy account', async () => {
      const { POST, mockGetSession, mockGetUserByWallet } = await setup();
      mockGetSession.mockResolvedValue(authenticatedSession);

      mockGetUserByWallet.mockResolvedValue({
        id: 'legacy-uuid',
        wallet: validWallet,
        privyUserId: 'did:privy:other-user',
      });

      const response = await POST(createRequest({ walletAddress: validWallet }));
      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.error).toContain('already linked');
    });

    it('returns 500 when merge fails', async () => {
      const { POST, mockGetSession, mockGetUserByWallet, mockMergeAccounts } = await setup();
      mockGetSession.mockResolvedValue(authenticatedSession);

      mockGetUserByWallet.mockResolvedValue({
        id: 'legacy-uuid',
        wallet: validWallet,
        privyUserId: null,
      });
      mockMergeAccounts.mockResolvedValue({ success: false, error: 'Transaction failed' });

      const response = await POST(createRequest({ walletAddress: validWallet }));
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Transaction failed');
    });
  });

  describe('Fresh wallet link (no legacy user)', () => {
    it('links wallet to current user when no legacy user exists', async () => {
      const { POST, mockGetSession, mockGetUserByWallet, mockLinkWalletToUser } = await setup();
      mockGetSession.mockResolvedValue(authenticatedSession);

      mockGetUserByWallet.mockResolvedValue(null);
      mockLinkWalletToUser.mockResolvedValue({
        id: 'user-uuid',
        wallet: validWallet.toLowerCase(),
      });

      const response = await POST(createRequest({ walletAddress: validWallet }));
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.merged).toBe(false);
      expect(mockLinkWalletToUser).toHaveBeenCalledWith('user-uuid', validWallet.toLowerCase());
    });

    it('returns 500 when linkWalletToUser throws', async () => {
      const { POST, mockGetSession, mockGetUserByWallet, mockLinkWalletToUser } = await setup();
      mockGetSession.mockResolvedValue(authenticatedSession);

      mockGetUserByWallet.mockResolvedValue(null);
      mockLinkWalletToUser.mockRejectedValue(new Error('DB error'));

      const response = await POST(createRequest({ walletAddress: validWallet }));
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to link wallet');
    });
  });

  describe('Wallet normalization', () => {
    it('normalizes wallet address to lowercase for lookup', async () => {
      const { POST, mockGetSession, mockGetUserByWallet, mockLinkWalletToUser } = await setup();
      mockGetSession.mockResolvedValue(authenticatedSession);

      const upperWallet = '0xABCDEF1234567890ABCDEF1234567890ABCDEF12';
      mockGetUserByWallet.mockResolvedValue(null);
      mockLinkWalletToUser.mockResolvedValue({ id: 'user-uuid', wallet: upperWallet.toLowerCase() });

      await POST(createRequest({ walletAddress: upperWallet }));
      expect(mockGetUserByWallet).toHaveBeenCalledWith(upperWallet.toLowerCase());
    });
  });
});
