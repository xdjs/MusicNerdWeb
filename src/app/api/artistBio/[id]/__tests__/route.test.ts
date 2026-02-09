// @ts-nocheck
import { jest } from '@jest/globals';

jest.mock('@/lib/auth-helpers', () => ({ requireAdmin: jest.fn() }));
jest.mock('@/server/utils/queries/artistQueries', () => ({
  getArtistById: jest.fn(),
  updateArtistBio: jest.fn(),
}));
jest.mock('@/server/utils/queries/artistBioQuery', () => ({ getOpenAIBio: jest.fn() }));

if (!('json' in Response)) {
  Response.json = (data, init) =>
    new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
      status: init?.status || 200,
    });
}

const adminAuth = {
  authenticated: true,
  session: { user: { id: 'admin-uuid' }, expires: '2025-12-31' },
  userId: 'admin-uuid',
};

const createPutRequest = (body) =>
  new Request('http://localhost/api/artistBio/artist-1', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('PUT /api/artistBio/[id]', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  async function setup() {
    const { requireAdmin } = await import('@/lib/auth-helpers');
    const { updateArtistBio } = await import('@/server/utils/queries/artistQueries');
    const { PUT } = await import('../route');
    return { PUT, mockRequireAdmin: requireAdmin, mockUpdateArtistBio: updateArtistBio };
  }

  it('returns 401 when not authenticated', async () => {
    const { PUT, mockRequireAdmin } = await setup();
    mockRequireAdmin.mockResolvedValue({
      authenticated: false,
      response: Response.json({ error: 'Not authenticated' }, { status: 401 }),
    });

    const response = await PUT(createPutRequest({ bio: 'test' }), { params: Promise.resolve({ id: 'a1' }) });
    expect(response.status).toBe(401);
  });

  it('returns 403 when non-admin', async () => {
    const { PUT, mockRequireAdmin } = await setup();
    mockRequireAdmin.mockResolvedValue({
      authenticated: false,
      response: Response.json({ error: 'Forbidden' }, { status: 403 }),
    });

    const response = await PUT(createPutRequest({ bio: 'test' }), { params: Promise.resolve({ id: 'a1' }) });
    expect(response.status).toBe(403);
  });

  it('returns 200 for admin with valid bio', async () => {
    const { PUT, mockRequireAdmin, mockUpdateArtistBio } = await setup();
    mockRequireAdmin.mockResolvedValue(adminAuth);
    mockUpdateArtistBio.mockResolvedValue({ status: 'success', message: 'Bio updated', data: null });

    const response = await PUT(createPutRequest({ bio: 'A great artist.' }), { params: Promise.resolve({ id: 'a1' }) });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.message).toBe('Bio updated');
  });

  it('returns 400 for invalid bio (empty)', async () => {
    const { PUT, mockRequireAdmin } = await setup();
    mockRequireAdmin.mockResolvedValue(adminAuth);

    const response = await PUT(createPutRequest({ bio: '' }), { params: Promise.resolve({ id: 'a1' }) });
    expect(response.status).toBe(400);
  });

  it('returns 400 for invalid bio (non-string)', async () => {
    const { PUT, mockRequireAdmin } = await setup();
    mockRequireAdmin.mockResolvedValue(adminAuth);

    const response = await PUT(createPutRequest({ bio: 42 }), { params: Promise.resolve({ id: 'a1' }) });
    expect(response.status).toBe(400);
  });
});
