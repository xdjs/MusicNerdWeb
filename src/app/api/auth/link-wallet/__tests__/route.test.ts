// @ts-nocheck
import { jest } from '@jest/globals';

// Mock user queries
jest.mock('@/server/utils/queries/userQueries', () => ({
  __esModule: true,
  getUserByWallet: jest.fn(),
  linkWalletToUser: jest.fn(),
  mergeAccounts: jest.fn(),
}));

// Mock auth
jest.mock('@/server/auth', () => ({
  getServerAuthSession: jest.fn(),
}));

// Polyfill Response.json for test environment
if (!('json' in Response)) {
  Response.json = (data: unknown, init?: ResponseInit) =>
    new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
      status: init?.status || 200,
      statusText: init?.statusText || 'OK',
    });
}

describe('POST /api/auth/link-wallet', () => {
  let getServerAuthSession: jest.Mock;
  let getUserByWallet: jest.Mock;
  let linkWalletToUser: jest.Mock;
  let mergeAccounts: jest.Mock;
  let POST: Function;

  beforeEach(async () => {
    jest.resetModules();

    const authModule = await import('@/server/auth');
    getServerAuthSession = authModule.getServerAuthSession as jest.Mock;

    const userQueries = await import('@/server/utils/queries/userQueries');
    getUserByWallet = userQueries.getUserByWallet as jest.Mock;
    linkWalletToUser = userQueries.linkWalletToUser as jest.Mock;
    mergeAccounts = userQueries.mergeAccounts as jest.Mock;

    getServerAuthSession.mockReset();
    getUserByWallet.mockReset();
    linkWalletToUser.mockReset();
    mergeAccounts.mockReset();

    const route = await import('../route');
    POST = route.POST;
  });

  function makeRequest(body: any) {
    return new Request('http://localhost/api/auth/link-wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('returns 401 when not authenticated', async () => {
    getServerAuthSession.mockResolvedValue(null);

    const response = await POST(makeRequest({ walletAddress: '0x1234567890abcdef1234567890abcdef12345678' }));

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Not authenticated');
  });

  it('returns 401 when session has no privyUserId', async () => {
    getServerAuthSession.mockResolvedValue({
      user: { id: 'user-1' }, // no privyUserId
    });

    const response = await POST(makeRequest({ walletAddress: '0x1234567890abcdef1234567890abcdef12345678' }));

    expect(response.status).toBe(401);
  });

  it('returns 400 for invalid wallet address', async () => {
    getServerAuthSession.mockResolvedValue({
      user: { id: 'user-1', privyUserId: 'did:privy:u1' },
    });

    const response = await POST(makeRequest({ walletAddress: 'not-a-wallet' }));

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid wallet address');
  });

  it('returns 400 for missing wallet address', async () => {
    getServerAuthSession.mockResolvedValue({
      user: { id: 'user-1', privyUserId: 'did:privy:u1' },
    });

    const response = await POST(makeRequest({}));

    expect(response.status).toBe(400);
  });

  it('returns 400 for invalid JSON body', async () => {
    getServerAuthSession.mockResolvedValue({
      user: { id: 'user-1', privyUserId: 'did:privy:u1' },
    });

    const request = new Request('http://localhost/api/auth/link-wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid request body');
  });

  it('links wallet when no legacy user exists', async () => {
    getServerAuthSession.mockResolvedValue({
      user: { id: 'user-1', privyUserId: 'did:privy:u1' },
    });
    getUserByWallet.mockResolvedValue(null);
    linkWalletToUser.mockResolvedValue({ id: 'user-1', wallet: '0xabcdef1234567890abcdef1234567890abcdef12' });

    const response = await POST(
      makeRequest({ walletAddress: '0xABCDEF1234567890ABCDEF1234567890ABCDEF12' })
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.merged).toBe(false);
    expect(data.message).toBe('Wallet linked successfully!');
    // Verify wallet was normalized to lowercase
    expect(linkWalletToUser).toHaveBeenCalledWith(
      'user-1',
      '0xabcdef1234567890abcdef1234567890abcdef12'
    );
  });

  it('merges accounts when legacy user exists without Privy ID', async () => {
    getServerAuthSession.mockResolvedValue({
      user: { id: 'privy-user-1', privyUserId: 'did:privy:u1' },
    });
    getUserByWallet.mockResolvedValue({
      id: 'legacy-user-1',
      wallet: '0xabcdef1234567890abcdef1234567890abcdef12',
      privyUserId: null,
    });
    mergeAccounts.mockResolvedValue({ success: true });

    const response = await POST(
      makeRequest({ walletAddress: '0xABCDEF1234567890ABCDEF1234567890ABCDEF12' })
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.merged).toBe(true);
    expect(mergeAccounts).toHaveBeenCalledWith('privy-user-1', 'legacy-user-1');
  });

  it('returns 409 when legacy user already has a Privy ID', async () => {
    getServerAuthSession.mockResolvedValue({
      user: { id: 'user-1', privyUserId: 'did:privy:u1' },
    });
    getUserByWallet.mockResolvedValue({
      id: 'legacy-1',
      wallet: '0xabcdef1234567890abcdef1234567890abcdef12',
      privyUserId: 'did:privy:other',
    });

    const response = await POST(
      makeRequest({ walletAddress: '0xABCDEF1234567890ABCDEF1234567890ABCDEF12' })
    );

    expect(response.status).toBe(409);
    const data = await response.json();
    expect(data.error).toBe('This wallet is already linked to another account');
  });

  it('returns 500 when merge fails', async () => {
    getServerAuthSession.mockResolvedValue({
      user: { id: 'user-1', privyUserId: 'did:privy:u1' },
    });
    getUserByWallet.mockResolvedValue({
      id: 'legacy-1',
      wallet: '0xabcdef1234567890abcdef1234567890abcdef12',
      privyUserId: null,
    });
    mergeAccounts.mockResolvedValue({ success: false, error: 'Merge failed' });

    const response = await POST(
      makeRequest({ walletAddress: '0xABCDEF1234567890ABCDEF1234567890ABCDEF12' })
    );

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Merge failed');
  });

  it('returns 500 on unexpected error', async () => {
    getServerAuthSession.mockResolvedValue({
      user: { id: 'user-1', privyUserId: 'did:privy:u1' },
    });
    getUserByWallet.mockRejectedValue(new Error('DB connection lost'));

    const response = await POST(
      makeRequest({ walletAddress: '0xABCDEF1234567890ABCDEF1234567890ABCDEF12' })
    );

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to link wallet');
  });
});
