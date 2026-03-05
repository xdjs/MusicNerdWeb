// @ts-nocheck

// Polyfill Response.json for JSDOM (not available natively in Node test env)
if (typeof Response !== 'undefined' && !(Response as any).json) {
  (Response as any).json = (data: any, init?: ResponseInit) =>
    new Response(JSON.stringify(data), {
      ...init,
      headers: { 'Content-Type': 'application/json' },
    });
}

// ── Server dependency mocks ───────────────────────────────────────────────────
const mockGetServerAuthSession = jest.fn();
jest.mock('@/server/auth', () => ({
  getServerAuthSession: (...args: any[]) => mockGetServerAuthSession(...args),
}));

const mockGetUserById = jest.fn();
jest.mock('@/server/utils/queries/userQueries', () => ({
  getUserById: (...args: any[]) => mockGetUserById(...args),
}));

// ── Import after mocks ────────────────────────────────────────────────────────
import { requireAuth, requireAdmin, requireWhitelistedOrAdmin } from '@/lib/auth-helpers';

// ── Fixtures ──────────────────────────────────────────────────────────────────
const mockSession = {
  user: { id: 'user-uuid', email: 'test@example.com', isAdmin: false },
  expires: '2099-01-01',
};

// ── requireAuth ───────────────────────────────────────────────────────────────
describe('requireAuth', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns authenticated: false with a 401 response when no session exists', async () => {
    mockGetServerAuthSession.mockResolvedValue(null);
    const result = await requireAuth();
    expect(result.authenticated).toBe(false);
    if (!result.authenticated) {
      expect(result.response.status).toBe(401);
    }
  });

  it('returns authenticated: false with a 401 when session has no user id', async () => {
    mockGetServerAuthSession.mockResolvedValue({ user: {}, expires: '2099-01-01' });
    const result = await requireAuth();
    expect(result.authenticated).toBe(false);
    if (!result.authenticated) {
      expect(result.response.status).toBe(401);
    }
  });

  it('returns authenticated: true with session and userId when authenticated', async () => {
    mockGetServerAuthSession.mockResolvedValue(mockSession);
    const result = await requireAuth();
    expect(result.authenticated).toBe(true);
    if (result.authenticated) {
      expect(result.userId).toBe('user-uuid');
      expect(result.session).toEqual(mockSession);
    }
  });

  it('response body contains "Not authenticated" error on 401', async () => {
    mockGetServerAuthSession.mockResolvedValue(null);
    const result = await requireAuth();
    if (!result.authenticated) {
      const body = await result.response.json();
      expect(body.error).toBe('Not authenticated');
    }
  });
});

// ── requireAdmin ──────────────────────────────────────────────────────────────
describe('requireAdmin', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    mockGetServerAuthSession.mockResolvedValue(null);
    const result = await requireAdmin();
    expect(result.authenticated).toBe(false);
    if (!result.authenticated) {
      expect(result.response.status).toBe(401);
    }
  });

  it('returns 403 when authenticated but not an admin', async () => {
    mockGetServerAuthSession.mockResolvedValue(mockSession);
    mockGetUserById.mockResolvedValue({ id: 'user-uuid', isAdmin: false, isWhiteListed: false });
    const result = await requireAdmin();
    expect(result.authenticated).toBe(false);
    if (!result.authenticated) {
      expect(result.response.status).toBe(403);
    }
  });

  it('returns authenticated: true when the user is an admin', async () => {
    mockGetServerAuthSession.mockResolvedValue(mockSession);
    mockGetUserById.mockResolvedValue({ id: 'user-uuid', isAdmin: true, isWhiteListed: false });
    const result = await requireAdmin();
    expect(result.authenticated).toBe(true);
  });

  it('returns 403 response body with "Forbidden" when not admin', async () => {
    mockGetServerAuthSession.mockResolvedValue(mockSession);
    mockGetUserById.mockResolvedValue({ id: 'user-uuid', isAdmin: false, isWhiteListed: false });
    const result = await requireAdmin();
    if (!result.authenticated) {
      const body = await result.response.json();
      expect(body.error).toBe('Forbidden');
    }
  });

  it('fetches the user record by the correct userId', async () => {
    mockGetServerAuthSession.mockResolvedValue(mockSession);
    mockGetUserById.mockResolvedValue({ id: 'user-uuid', isAdmin: true });
    await requireAdmin();
    expect(mockGetUserById).toHaveBeenCalledWith('user-uuid');
  });
});

// ── requireWhitelistedOrAdmin ─────────────────────────────────────────────────
describe('requireWhitelistedOrAdmin', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    mockGetServerAuthSession.mockResolvedValue(null);
    const result = await requireWhitelistedOrAdmin();
    expect(result.authenticated).toBe(false);
    if (!result.authenticated) {
      expect(result.response.status).toBe(401);
    }
  });

  it('returns 403 when authenticated but neither whitelisted nor admin', async () => {
    mockGetServerAuthSession.mockResolvedValue(mockSession);
    mockGetUserById.mockResolvedValue({ id: 'user-uuid', isAdmin: false, isWhiteListed: false });
    const result = await requireWhitelistedOrAdmin();
    expect(result.authenticated).toBe(false);
    if (!result.authenticated) {
      expect(result.response.status).toBe(403);
    }
  });

  it('returns authenticated: true when user is whitelisted', async () => {
    mockGetServerAuthSession.mockResolvedValue(mockSession);
    mockGetUserById.mockResolvedValue({ id: 'user-uuid', isAdmin: false, isWhiteListed: true });
    const result = await requireWhitelistedOrAdmin();
    expect(result.authenticated).toBe(true);
  });

  it('returns authenticated: true when user is an admin', async () => {
    mockGetServerAuthSession.mockResolvedValue(mockSession);
    mockGetUserById.mockResolvedValue({ id: 'user-uuid', isAdmin: true, isWhiteListed: false });
    const result = await requireWhitelistedOrAdmin();
    expect(result.authenticated).toBe(true);
  });

  it('returns authenticated: true when user is both admin and whitelisted', async () => {
    mockGetServerAuthSession.mockResolvedValue(mockSession);
    mockGetUserById.mockResolvedValue({ id: 'user-uuid', isAdmin: true, isWhiteListed: true });
    const result = await requireWhitelistedOrAdmin();
    expect(result.authenticated).toBe(true);
  });

  it('returns 403 response body with "Forbidden" when neither whitelisted nor admin', async () => {
    mockGetServerAuthSession.mockResolvedValue(mockSession);
    mockGetUserById.mockResolvedValue({ id: 'user-uuid', isAdmin: false, isWhiteListed: false });
    const result = await requireWhitelistedOrAdmin();
    if (!result.authenticated) {
      const body = await result.response.json();
      expect(body.error).toBe('Forbidden');
    }
  });
});
