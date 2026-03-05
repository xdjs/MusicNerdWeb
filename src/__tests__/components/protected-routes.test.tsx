// @ts-nocheck

/**
 * protected-routes.test.tsx
 *
 * Tests for the auth helper functions in src/lib/auth-helpers.ts:
 *   - requireAuth()              → 401 if no session, success otherwise
 *   - requireAdmin()             → 401 if no session, 403 if not admin, success if admin
 *   - requireWhitelistedOrAdmin() → 401 if no session, 403 if neither, success if whitelisted or admin
 */

// ── Dependency mocks ──────────────────────────────────────────────────────────
const mockGetServerAuthSession = jest.fn();
jest.mock('@/server/auth', () => ({
  getServerAuthSession: (...args) => mockGetServerAuthSession(...args),
}));

const mockGetUserById = jest.fn();
jest.mock('@/server/utils/queries/userQueries', () => ({
  getUserById: (...args) => mockGetUserById(...args),
}));

// Polyfill Response.json — JSDOM doesn't include this static helper
if (typeof Response !== 'undefined' && !(Response as any).json) {
  (Response as any).json = (data: any, init?: ResponseInit) =>
    new Response(JSON.stringify(data), {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
}

// ── Import after mocks ────────────────────────────────────────────────────────
import { requireAuth, requireAdmin, requireWhitelistedOrAdmin } from '@/lib/auth-helpers';

// ── Fixtures ──────────────────────────────────────────────────────────────────
const mockSession = {
  user: { id: 'user-uuid', email: 'test@example.com' },
  expires: '2099-01-01',
};

async function parseResponse(result: { authenticated: false; response: Response }) {
  const body = await result.response.json();
  return { status: result.response.status, body };
}

// ─────────────────────────────────────────────────────────────────────────────
// requireAuth
// ─────────────────────────────────────────────────────────────────────────────
describe('requireAuth()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when there is no session', async () => {
    mockGetServerAuthSession.mockResolvedValue(null);

    const result = await requireAuth();

    expect(result.authenticated).toBe(false);
    const { status, body } = await parseResponse(result as any);
    expect(status).toBe(401);
    expect(body.error).toMatch(/not authenticated/i);
  });

  it('returns 401 when session exists but has no user ID', async () => {
    mockGetServerAuthSession.mockResolvedValue({ user: {}, expires: '2099-01-01' });

    const result = await requireAuth();

    expect(result.authenticated).toBe(false);
    const { status } = await parseResponse(result as any);
    expect(status).toBe(401);
  });

  it('returns authenticated: true when a valid session exists', async () => {
    mockGetServerAuthSession.mockResolvedValue(mockSession);

    const result = await requireAuth();

    expect(result.authenticated).toBe(true);
    if (result.authenticated) {
      expect(result.userId).toBe('user-uuid');
      expect(result.session).toBe(mockSession);
    }
  });

  it('does not call getUserById', async () => {
    mockGetServerAuthSession.mockResolvedValue(mockSession);

    await requireAuth();

    expect(mockGetUserById).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// requireAdmin
// ─────────────────────────────────────────────────────────────────────────────
describe('requireAdmin()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when there is no session', async () => {
    mockGetServerAuthSession.mockResolvedValue(null);

    const result = await requireAdmin();

    expect(result.authenticated).toBe(false);
    const { status, body } = await parseResponse(result as any);
    expect(status).toBe(401);
    expect(body.error).toMatch(/not authenticated/i);
  });

  it('returns 403 when user is authenticated but not an admin', async () => {
    mockGetServerAuthSession.mockResolvedValue(mockSession);
    mockGetUserById.mockResolvedValue({ id: 'user-uuid', isAdmin: false, isWhiteListed: true });

    const result = await requireAdmin();

    expect(result.authenticated).toBe(false);
    const { status, body } = await parseResponse(result as any);
    expect(status).toBe(403);
    expect(body.error).toMatch(/forbidden/i);
  });

  it('returns 403 when getUserById returns null', async () => {
    mockGetServerAuthSession.mockResolvedValue(mockSession);
    mockGetUserById.mockResolvedValue(null);

    const result = await requireAdmin();

    expect(result.authenticated).toBe(false);
    const { status } = await parseResponse(result as any);
    expect(status).toBe(403);
  });

  it('returns authenticated: true when user is an admin', async () => {
    mockGetServerAuthSession.mockResolvedValue(mockSession);
    mockGetUserById.mockResolvedValue({ id: 'user-uuid', isAdmin: true });

    const result = await requireAdmin();

    expect(result.authenticated).toBe(true);
    if (result.authenticated) {
      expect(result.userId).toBe('user-uuid');
    }
  });

  it('calls getUserById with the session user ID', async () => {
    mockGetServerAuthSession.mockResolvedValue(mockSession);
    mockGetUserById.mockResolvedValue({ id: 'user-uuid', isAdmin: true });

    await requireAdmin();

    expect(mockGetUserById).toHaveBeenCalledWith('user-uuid');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// requireWhitelistedOrAdmin
// ─────────────────────────────────────────────────────────────────────────────
describe('requireWhitelistedOrAdmin()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when there is no session', async () => {
    mockGetServerAuthSession.mockResolvedValue(null);

    const result = await requireWhitelistedOrAdmin();

    expect(result.authenticated).toBe(false);
    const { status, body } = await parseResponse(result as any);
    expect(status).toBe(401);
    expect(body.error).toMatch(/not authenticated/i);
  });

  it('returns 403 when user is neither whitelisted nor admin', async () => {
    mockGetServerAuthSession.mockResolvedValue(mockSession);
    mockGetUserById.mockResolvedValue({ id: 'user-uuid', isAdmin: false, isWhiteListed: false });

    const result = await requireWhitelistedOrAdmin();

    expect(result.authenticated).toBe(false);
    const { status, body } = await parseResponse(result as any);
    expect(status).toBe(403);
    expect(body.error).toMatch(/forbidden/i);
  });

  it('returns 403 when getUserById returns null', async () => {
    mockGetServerAuthSession.mockResolvedValue(mockSession);
    mockGetUserById.mockResolvedValue(null);

    const result = await requireWhitelistedOrAdmin();

    expect(result.authenticated).toBe(false);
    const { status } = await parseResponse(result as any);
    expect(status).toBe(403);
  });

  it('returns authenticated: true when user is whitelisted (not admin)', async () => {
    mockGetServerAuthSession.mockResolvedValue(mockSession);
    mockGetUserById.mockResolvedValue({ id: 'user-uuid', isAdmin: false, isWhiteListed: true });

    const result = await requireWhitelistedOrAdmin();

    expect(result.authenticated).toBe(true);
    if (result.authenticated) {
      expect(result.userId).toBe('user-uuid');
    }
  });

  it('returns authenticated: true when user is admin (not whitelisted)', async () => {
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

  it('calls getUserById with the session user ID', async () => {
    mockGetServerAuthSession.mockResolvedValue(mockSession);
    mockGetUserById.mockResolvedValue({ id: 'user-uuid', isAdmin: true, isWhiteListed: false });

    await requireWhitelistedOrAdmin();

    expect(mockGetUserById).toHaveBeenCalledWith('user-uuid');
  });
});
