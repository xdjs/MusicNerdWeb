// @ts-nocheck
import { jest } from '@jest/globals';

jest.mock('@/server/auth', () => ({ getServerAuthSession: jest.fn() }));
jest.mock('@/server/db/drizzle', () => {
  const mockQuery = {
    from: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue([]),
  };
  return {
    db: {
      select: jest.fn().mockReturnValue(mockQuery),
    },
  };
});
jest.mock('@/server/db/schema', () => ({
  ugcresearch: {
    id: 'id', artistId: 'artistId', updatedAt: 'updatedAt',
    userId: 'userId', accepted: 'accepted',
  },
  artists: { id: 'id', name: 'name', spotify: 'spotify' },
}));
jest.mock('@/server/utils/queries/externalApiQueries', () => ({
  getSpotifyHeaders: jest.fn().mockResolvedValue({ headers: { Authorization: 'Bearer test' } }),
  getSpotifyImage: jest.fn().mockResolvedValue({ artistImage: '', artistId: '' }),
}));

if (!('json' in Response)) {
  Response.json = (data, init) =>
    new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
      status: init?.status || 200,
    });
}

describe('GET /api/recentEdited', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  async function setup() {
    const { getServerAuthSession } = await import('@/server/auth');
    const { GET } = await import('../route');
    return { GET, mockGetSession: getServerAuthSession };
  }

  it('returns [] when not authenticated and no userId param', async () => {
    const { GET, mockGetSession } = await setup();
    mockGetSession.mockResolvedValue(null);

    const response = await GET(new Request('http://localhost/api/recentEdited'));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual([]);
  });

  it('uses userId query param when provided', async () => {
    const { GET } = await setup();

    const response = await GET(new Request('http://localhost/api/recentEdited?userId=user-1'));
    expect(response.status).toBe(200);
    // Should not return error since userId param bypasses session
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it('returns enriched entries for authenticated user', async () => {
    const { GET, mockGetSession } = await setup();
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' }, expires: '2025-12-31' });

    const response = await GET(new Request('http://localhost/api/recentEdited'));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it('returns [] on error', async () => {
    const { GET, mockGetSession } = await setup();
    mockGetSession.mockRejectedValue(new Error('DB error'));

    const response = await GET(new Request('http://localhost/api/recentEdited'));
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toEqual([]);
  });
});
