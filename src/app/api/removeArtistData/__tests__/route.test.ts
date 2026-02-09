// @ts-nocheck
import { jest } from '@jest/globals';

jest.mock('@/lib/auth-helpers', () => ({ requireAuth: jest.fn() }));
jest.mock('@/server/utils/queries/artistQueries', () => ({ removeArtistData: jest.fn() }));

if (!('json' in Response)) {
  Response.json = (data, init) =>
    new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
      status: init?.status || 200,
    });
}

const createRequest = (body) =>
  new Request('http://localhost/api/removeArtistData', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const validAuth = {
  authenticated: true,
  session: { user: { id: 'user-1' }, expires: '2025-12-31' },
  userId: 'user-1',
};

describe('POST /api/removeArtistData', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  async function setup() {
    const { requireAuth } = await import('@/lib/auth-helpers');
    const { removeArtistData } = await import('@/server/utils/queries/artistQueries');
    const { POST } = await import('../route');
    return { POST, mockRequireAuth: requireAuth, mockRemoveArtistData: removeArtistData };
  }

  it('returns 401 when not authenticated', async () => {
    const { POST, mockRequireAuth } = await setup();
    mockRequireAuth.mockResolvedValue({
      authenticated: false,
      response: Response.json({ error: 'Not authenticated' }, { status: 401 }),
    });

    const response = await POST(createRequest({ artistId: 'a1', siteName: 'spotify' }));
    expect(response.status).toBe(401);
  });

  it('returns 400 when artistId missing', async () => {
    const { POST, mockRequireAuth } = await setup();
    mockRequireAuth.mockResolvedValue(validAuth);

    const response = await POST(createRequest({ siteName: 'spotify' }));
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.message).toBe('Missing parameters');
  });

  it('returns 400 when siteName missing', async () => {
    const { POST, mockRequireAuth } = await setup();
    mockRequireAuth.mockResolvedValue(validAuth);

    const response = await POST(createRequest({ artistId: 'a1' }));
    expect(response.status).toBe(400);
  });

  it('returns 200 on successful removal', async () => {
    const { POST, mockRequireAuth, mockRemoveArtistData } = await setup();
    mockRequireAuth.mockResolvedValue(validAuth);
    mockRemoveArtistData.mockResolvedValue({ status: 'success', message: 'Removed' });

    const response = await POST(createRequest({ artistId: 'a1', siteName: 'spotify' }));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.message).toBe('Removed');
  });

  it('returns 403 when business logic fails', async () => {
    const { POST, mockRequireAuth, mockRemoveArtistData } = await setup();
    mockRequireAuth.mockResolvedValue(validAuth);
    mockRemoveArtistData.mockResolvedValue({ status: 'error', message: 'Not allowed' });

    const response = await POST(createRequest({ artistId: 'a1', siteName: 'spotify' }));
    expect(response.status).toBe(403);
  });

  it('returns 500 on unexpected error', async () => {
    const { POST, mockRequireAuth } = await setup();
    mockRequireAuth.mockRejectedValue(new Error('boom'));

    const response = await POST(createRequest({ artistId: 'a1', siteName: 'spotify' }));
    expect(response.status).toBe(500);
  });
});
