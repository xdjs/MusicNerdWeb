// @ts-nocheck
import { jest } from '@jest/globals';

jest.mock('@/server/auth', () => ({ getServerAuthSession: jest.fn() }));
jest.mock('@/server/db/drizzle', () => ({
  db: { query: { ugcresearch: { findMany: jest.fn() } } },
}));
jest.mock('@/server/db/schema', () => ({
  ugcresearch: { userId: 'userId', id: 'id' },
}));

if (!('json' in Response)) {
  Response.json = (data, init) =>
    new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
      status: init?.status || 200,
    });
}

describe('GET /api/ugcCount', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  async function setup() {
    const { getServerAuthSession } = await import('@/server/auth');
    const { db } = await import('@/server/db/drizzle');
    const { GET } = await import('../route');
    return { GET, mockGetSession: getServerAuthSession, mockDb: db };
  }

  it('returns count 0 when not authenticated', async () => {
    const { GET, mockGetSession } = await setup();
    mockGetSession.mockResolvedValue(null);

    const response = await GET();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.count).toBe(0);
  });

  it('returns correct count for authenticated user', async () => {
    const { GET, mockGetSession, mockDb } = await setup();
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' }, expires: '2025-12-31' });
    mockDb.query.ugcresearch.findMany.mockResolvedValue([{ id: '1' }, { id: '2' }, { id: '3' }]);

    const response = await GET();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.count).toBe(3);
  });

  it('returns count 0 for user with no entries', async () => {
    const { GET, mockGetSession, mockDb } = await setup();
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' }, expires: '2025-12-31' });
    mockDb.query.ugcresearch.findMany.mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();
    expect(data.count).toBe(0);
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
