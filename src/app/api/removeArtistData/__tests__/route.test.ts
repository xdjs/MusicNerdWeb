// @ts-nocheck

import { jest } from '@jest/globals';

jest.mock('@/lib/auth-helpers', () => ({
  requireAuth: jest.fn(),
}));

jest.mock('@/server/utils/queries/artistQueries', () => ({
  removeArtistData: jest.fn(),
}));

// Polyfill Response.json for test environment
if (!('json' in Response)) {
  Response.json = (data, init) =>
    new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
      status: init?.status || 200,
    });
}

const createRequest = (body?: any) =>
  new Request('http://localhost/api/removeArtistData', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : 'invalid-json{',
  });

describe('POST /api/removeArtistData', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  async function setup() {
    const { requireAuth } = await import('@/lib/auth-helpers');
    const { removeArtistData } = await import('@/server/utils/queries/artistQueries');
    const { POST } = await import('../route');

    return {
      POST,
      mockRequireAuth: requireAuth as jest.Mock,
      mockRemoveArtistData: removeArtistData as jest.Mock,
    };
  }

  it('returns 401 when not authenticated', async () => {
    const { POST, mockRequireAuth } = await setup();
    mockRequireAuth.mockResolvedValue({
      authenticated: false,
      response: Response.json({ error: 'Not authenticated' }, { status: 401 }),
    });

    const response = await POST(createRequest({ artistId: 'a1', siteName: 'spotify' }));
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Not authenticated');
  });

  it('returns 400 when artistId is missing', async () => {
    const { POST, mockRequireAuth } = await setup();
    mockRequireAuth.mockResolvedValue({
      authenticated: true,
      session: { user: { id: 'user-123' } },
      userId: 'user-123',
    });

    const response = await POST(createRequest({ siteName: 'spotify' }));
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('artistId and siteName are required');
  });

  it('returns 400 when siteName is missing', async () => {
    const { POST, mockRequireAuth } = await setup();
    mockRequireAuth.mockResolvedValue({
      authenticated: true,
      session: { user: { id: 'user-123' } },
      userId: 'user-123',
    });

    const response = await POST(createRequest({ artistId: 'artist-1' }));
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('artistId and siteName are required');
  });

  it('returns 200 on successful removal', async () => {
    const { POST, mockRequireAuth, mockRemoveArtistData } = await setup();
    mockRequireAuth.mockResolvedValue({
      authenticated: true,
      session: { user: { id: 'user-123' } },
      userId: 'user-123',
    });
    mockRemoveArtistData.mockResolvedValue({
      status: 'success',
      message: 'Artist data removed',
    });

    const response = await POST(createRequest({ artistId: 'artist-1', siteName: 'spotify' }));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.message).toBe('Artist data removed');
  });

  it('returns 403 when business logic fails', async () => {
    const { POST, mockRequireAuth, mockRemoveArtistData } = await setup();
    mockRequireAuth.mockResolvedValue({
      authenticated: true,
      session: { user: { id: 'user-123' } },
      userId: 'user-123',
    });
    mockRemoveArtistData.mockResolvedValue({
      status: 'error',
      message: 'Unauthorized',
    });

    const response = await POST(createRequest({ artistId: 'artist-1', siteName: 'spotify' }));
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 500 on unexpected error', async () => {
    const { POST, mockRequireAuth, mockRemoveArtistData } = await setup();
    mockRequireAuth.mockResolvedValue({
      authenticated: true,
      session: { user: { id: 'user-123' } },
      userId: 'user-123',
    });
    mockRemoveArtistData.mockRejectedValue(new Error('Unexpected failure'));

    const response = await POST(createRequest({ artistId: 'artist-1', siteName: 'spotify' }));
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Internal server error');
  });
});
