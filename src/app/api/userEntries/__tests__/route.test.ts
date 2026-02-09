// @ts-nocheck
import { jest } from '@jest/globals';

jest.mock('@/server/auth', () => ({ getServerAuthSession: jest.fn() }));
jest.mock('@/server/db/drizzle', () => {
  const mockQuery = {
    from: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockResolvedValue([]),
  };
  return {
    db: {
      query: { ugcresearch: { findMany: jest.fn().mockResolvedValue([]) } },
      select: jest.fn().mockReturnValue(mockQuery),
    },
  };
});
jest.mock('@/server/db/schema', () => ({
  ugcresearch: {
    id: 'id', createdAt: 'createdAt', siteName: 'siteName',
    ugcUrl: 'ugcUrl', accepted: 'accepted', userId: 'userId', artistId: 'artistId',
  },
  artists: { id: 'id', name: 'name' },
}));

if (!('json' in Response)) {
  Response.json = (data, init) =>
    new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
      status: init?.status || 200,
    });
}

describe('GET /api/userEntries', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  async function setup() {
    const { getServerAuthSession } = await import('@/server/auth');
    const { GET } = await import('../route');
    return { GET, mockGetSession: getServerAuthSession };
  }

  it('returns empty result when not authenticated', async () => {
    const { GET, mockGetSession } = await setup();
    mockGetSession.mockResolvedValue(null);

    const response = await GET(new Request('http://localhost/api/userEntries'));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.entries).toEqual([]);
    expect(data.total).toBe(0);
  });

  it('returns entries for authenticated user', async () => {
    const { GET, mockGetSession } = await setup();
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' }, expires: '2025-12-31' });

    const response = await GET(new Request('http://localhost/api/userEntries'));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('entries');
    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('pageCount');
  });

  it('returns 500 on error', async () => {
    const { GET, mockGetSession } = await setup();
    mockGetSession.mockRejectedValue(new Error('DB error'));

    const response = await GET(new Request('http://localhost/api/userEntries'));
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.entries).toEqual([]);
  });
});
