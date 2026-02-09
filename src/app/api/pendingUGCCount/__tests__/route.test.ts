// @ts-nocheck
import { jest } from '@jest/globals';

jest.mock('@/server/auth', () => ({ getServerAuthSession: jest.fn() }));
jest.mock('@/server/utils/queries/userQueries', () => ({ getUserById: jest.fn() }));
jest.mock('@/server/utils/queries/artistQueries', () => ({ getPendingUGC: jest.fn() }));

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
    return { GET, mockGetSession: getServerAuthSession, mockGetUserById: getUserById, mockGetPendingUGC: getPendingUGC };
  }

  it('returns count 0 when not authenticated', async () => {
    const { GET, mockGetSession } = await setup();
    mockGetSession.mockResolvedValue(null);

    const response = await GET();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.count).toBe(0);
  });

  it('returns count 0 for non-admin user', async () => {
    const { GET, mockGetSession, mockGetUserById } = await setup();
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' }, expires: '2025-12-31' });
    mockGetUserById.mockResolvedValue({ id: 'user-1', isAdmin: false });

    const response = await GET();
    const data = await response.json();
    expect(data.count).toBe(0);
  });

  it('returns correct count for admin user', async () => {
    const { GET, mockGetSession, mockGetUserById, mockGetPendingUGC } = await setup();
    mockGetSession.mockResolvedValue({ user: { id: 'admin-1' }, expires: '2025-12-31' });
    mockGetUserById.mockResolvedValue({ id: 'admin-1', isAdmin: true });
    mockGetPendingUGC.mockResolvedValue([{ id: '1' }, { id: '2' }]);

    const response = await GET();
    const data = await response.json();
    expect(data.count).toBe(2);
  });

  it('returns count 0 on error', async () => {
    const { GET, mockGetSession } = await setup();
    mockGetSession.mockRejectedValue(new Error('DB error'));

    const response = await GET();
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.count).toBe(0);
  });
});
