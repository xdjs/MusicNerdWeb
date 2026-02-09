// @ts-nocheck
import { jest } from '@jest/globals';

jest.mock('@/server/auth', () => ({ getServerAuthSession: jest.fn() }));
jest.mock('@/server/utils/queries/userQueries', () => ({ getUserById: jest.fn() }));

if (!('json' in Response)) {
  Response.json = (data, init) =>
    new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
      status: init?.status || 200,
    });
}

const createRequest = () =>
  new Request('http://localhost/api/user/user-1', { method: 'GET' });

describe('GET /api/user/[id]', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  async function setup() {
    const { getServerAuthSession } = await import('@/server/auth');
    const { getUserById } = await import('@/server/utils/queries/userQueries');
    const { GET } = await import('../route');
    return { GET, mockGetSession: getServerAuthSession, mockGetUserById: getUserById };
  }

  it('returns 401 when not authenticated', async () => {
    const { GET, mockGetSession } = await setup();
    mockGetSession.mockResolvedValue(null);

    const response = await GET(createRequest(), { params: Promise.resolve({ id: 'user-1' }) });
    expect(response.status).toBe(401);
  });

  it('returns 401 when requesting another user data', async () => {
    const { GET, mockGetSession } = await setup();
    mockGetSession.mockResolvedValue({ user: { id: 'other-user' }, expires: '2025-12-31' });

    const response = await GET(createRequest(), { params: Promise.resolve({ id: 'user-1' }) });
    expect(response.status).toBe(401);
  });

  it('returns 200 with user data when requesting own data', async () => {
    const { GET, mockGetSession, mockGetUserById } = await setup();
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' }, expires: '2025-12-31' });
    mockGetUserById.mockResolvedValue({ id: 'user-1', email: 'test@test.com', isAdmin: false });

    const response = await GET(createRequest(), { params: Promise.resolve({ id: 'user-1' }) });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.id).toBe('user-1');
  });

  it('returns 404 when user not found', async () => {
    const { GET, mockGetSession, mockGetUserById } = await setup();
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' }, expires: '2025-12-31' });
    mockGetUserById.mockResolvedValue(null);

    const response = await GET(createRequest(), { params: Promise.resolve({ id: 'user-1' }) });
    expect(response.status).toBe(404);
  });

  it('returns 500 on unexpected error', async () => {
    const { GET, mockGetSession } = await setup();
    mockGetSession.mockRejectedValue(new Error('DB error'));

    const response = await GET(createRequest(), { params: Promise.resolve({ id: 'user-1' }) });
    expect(response.status).toBe(500);
  });
});
