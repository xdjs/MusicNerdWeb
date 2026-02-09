// @ts-nocheck

import { jest } from '@jest/globals';

jest.mock('@/server/auth', () => ({
  getServerAuthSession: jest.fn(),
}));

jest.mock('@/server/utils/queries/userQueries', () => ({
  getUserById: jest.fn(),
}));

// Polyfill Response.json for test environment
if (!('json' in Response)) {
  Response.json = (data, init) =>
    new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
      status: init?.status || 200,
    });
}

describe('auth-helpers', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  async function setup() {
    const { getServerAuthSession } = await import('@/server/auth');
    const { getUserById } = await import('@/server/utils/queries/userQueries');
    const { requireAuth, requireAdmin } = await import('../auth-helpers');

    return {
      requireAuth,
      requireAdmin,
      mockGetSession: getServerAuthSession as jest.Mock,
      mockGetUserById: getUserById as jest.Mock,
    };
  }

  describe('requireAuth', () => {
    it('returns 401 when session is null', async () => {
      const { requireAuth, mockGetSession } = await setup();
      mockGetSession.mockResolvedValue(null);

      const result = await requireAuth();

      expect(result.authenticated).toBe(false);
      if (!result.authenticated) {
        expect(result.response.status).toBe(401);
      }
    });

    it('returns 401 when session.user.id is missing', async () => {
      const { requireAuth, mockGetSession } = await setup();
      mockGetSession.mockResolvedValue({ user: { email: 'test@test.com' } });

      const result = await requireAuth();

      expect(result.authenticated).toBe(false);
      if (!result.authenticated) {
        expect(result.response.status).toBe(401);
      }
    });

    it('returns session and userId on valid session', async () => {
      const { requireAuth, mockGetSession } = await setup();
      const session = { user: { id: 'user-123', email: 'test@test.com' }, expires: '2025-12-31' };
      mockGetSession.mockResolvedValue(session);

      const result = await requireAuth();

      expect(result.authenticated).toBe(true);
      if (result.authenticated) {
        expect(result.session).toEqual(session);
        expect(result.userId).toBe('user-123');
      }
    });
  });

  describe('requireAdmin', () => {
    it('returns 401 when not authenticated', async () => {
      const { requireAdmin, mockGetSession } = await setup();
      mockGetSession.mockResolvedValue(null);

      const result = await requireAdmin();

      expect(result.authenticated).toBe(false);
      if (!result.authenticated) {
        expect(result.response.status).toBe(401);
      }
    });

    it('returns 403 when user is not admin', async () => {
      const { requireAdmin, mockGetSession, mockGetUserById } = await setup();
      const session = { user: { id: 'user-123' }, expires: '2025-12-31' };
      mockGetSession.mockResolvedValue(session);
      mockGetUserById.mockResolvedValue({ id: 'user-123', isAdmin: false });

      const result = await requireAdmin();

      expect(result.authenticated).toBe(false);
      if (!result.authenticated) {
        expect(result.response.status).toBe(403);
      }
    });

    it('returns 403 when user not found in database', async () => {
      const { requireAdmin, mockGetSession, mockGetUserById } = await setup();
      const session = { user: { id: 'user-123' }, expires: '2025-12-31' };
      mockGetSession.mockResolvedValue(session);
      mockGetUserById.mockResolvedValue(null);

      const result = await requireAdmin();

      expect(result.authenticated).toBe(false);
      if (!result.authenticated) {
        expect(result.response.status).toBe(403);
      }
    });

    it('returns session and userId when user is admin', async () => {
      const { requireAdmin, mockGetSession, mockGetUserById } = await setup();
      const session = { user: { id: 'admin-123' }, expires: '2025-12-31' };
      mockGetSession.mockResolvedValue(session);
      mockGetUserById.mockResolvedValue({ id: 'admin-123', isAdmin: true });

      const result = await requireAdmin();

      expect(result.authenticated).toBe(true);
      if (result.authenticated) {
        expect(result.session).toEqual(session);
        expect(result.userId).toBe('admin-123');
      }
    });
  });
});
