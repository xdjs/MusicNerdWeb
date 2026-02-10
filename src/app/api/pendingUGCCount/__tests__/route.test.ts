// @ts-nocheck

import { jest } from '@jest/globals';

jest.mock('@/server/auth', () => ({
  getServerAuthSession: jest.fn(),
}));

jest.mock('@/server/utils/queries/userQueries', () => ({
  getUserById: jest.fn(),
}));

jest.mock('@/server/utils/queries/artistQueries', () => ({
  getPendingUGC: jest.fn(),
}));

// Polyfill Response.json for test environment
if (!('json' in Response)) {
  Response.json = (data, init) =>
    new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
      status: init?.status || 200,
    });
}

describe('GET /api/pendingUGCCount', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  async function setup() {
    const { getServerAuthSession } = await import('@/server/auth');
    const { getUserById } = await import('@/server/utils/queries/userQueries');
    const { getPendingUGC } = await import('@/server/utils/queries/artistQueries');
    const { GET } = await import('../route');

    return {
      GET,
      mockGetSession: getServerAuthSession as jest.Mock,
      mockGetUserById: getUserById as jest.Mock,
      mockGetPendingUGC: getPendingUGC as jest.Mock,
    };
  }

  it('returns { count: 0 } when not authenticated', async () => {
    const { GET, mockGetSession } = await setup();
    mockGetSession.mockResolvedValue(null);

    const response = await GET();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ count: 0 });
  });

  it('returns { count: 0 } for non-admin user', async () => {
    const { GET, mockGetSession, mockGetUserById } = await setup();
    mockGetSession.mockResolvedValue({
      user: { id: 'user-123' },
      expires: '2025-12-31',
    });
    mockGetUserById.mockResolvedValue({
      id: 'user-123',
      isAdmin: false,
      isWhiteListed: true,
    });

    const response = await GET();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ count: 0 });
  });

  it('returns correct count for admin user', async () => {
    const { GET, mockGetSession, mockGetUserById, mockGetPendingUGC } = await setup();
    mockGetSession.mockResolvedValue({
      user: { id: 'admin-123' },
      expires: '2025-12-31',
    });
    mockGetUserById.mockResolvedValue({
      id: 'admin-123',
      isAdmin: true,
    });
    mockGetPendingUGC.mockResolvedValue([
      { id: '1', accepted: false },
      { id: '2', accepted: false },
      { id: '3', accepted: false },
      { id: '4', accepted: false },
      { id: '5', accepted: false },
    ]);

    const response = await GET();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ count: 5 });
  });

  it('returns { count: 0 } on error', async () => {
    const { GET, mockGetSession, mockGetUserById } = await setup();
    mockGetSession.mockResolvedValue({
      user: { id: 'admin-123' },
      expires: '2025-12-31',
    });
    mockGetUserById.mockRejectedValue(new Error('DB error'));

    const response = await GET();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ count: 0 });
  });
});
