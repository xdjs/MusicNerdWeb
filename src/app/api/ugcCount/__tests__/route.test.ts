// @ts-nocheck

import { jest } from '@jest/globals';

jest.mock('@/server/auth', () => ({
  getServerAuthSession: jest.fn(),
}));

jest.mock('@/server/db/drizzle', () => ({
  db: {
    query: {
      ugcresearch: {
        findMany: jest.fn(),
      },
    },
  },
}));

jest.mock('@/server/db/schema', () => ({
  ugcresearch: { userId: 'userId' },
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn((...args) => args),
}));

// Polyfill Response.json for test environment
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

    return {
      GET,
      mockGetSession: getServerAuthSession as jest.Mock,
      mockFindMany: db.query.ugcresearch.findMany as jest.Mock,
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

  it('returns correct count for authenticated user with entries', async () => {
    const { GET, mockGetSession, mockFindMany } = await setup();
    mockGetSession.mockResolvedValue({
      user: { id: 'user-123' },
      expires: '2025-12-31',
    });
    mockFindMany.mockResolvedValue([
      { id: '1', userId: 'user-123' },
      { id: '2', userId: 'user-123' },
      { id: '3', userId: 'user-123' },
    ]);

    const response = await GET();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ count: 3 });
  });

  it('returns { count: 0 } for user with no entries', async () => {
    const { GET, mockGetSession, mockFindMany } = await setup();
    mockGetSession.mockResolvedValue({
      user: { id: 'user-123' },
      expires: '2025-12-31',
    });
    mockFindMany.mockResolvedValue([]);

    const response = await GET();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ count: 0 });
  });

  it('returns { count: 0 } with status 500 on error', async () => {
    const { GET, mockGetSession, mockFindMany } = await setup();
    mockGetSession.mockResolvedValue({
      user: { id: 'user-123' },
      expires: '2025-12-31',
    });
    mockFindMany.mockRejectedValue(new Error('DB error'));

    const response = await GET();
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toEqual({ count: 0 });
  });
});
