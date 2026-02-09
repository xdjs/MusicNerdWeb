// @ts-nocheck
import { jest } from '@jest/globals';

jest.mock('@/lib/auth-helpers', () => ({ requireAdmin: jest.fn() }));
jest.mock('@/server/utils/queries/userQueries', () => ({ updateWhitelistedUser: jest.fn() }));

if (!('json' in Response)) {
  Response.json = (data, init) =>
    new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
      status: init?.status || 200,
    });
}

const createRequest = (body) =>
  new Request('http://localhost/api/admin/whitelist-user/test-user-id', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const adminAuth = {
  authenticated: true,
  session: { user: { id: 'admin-uuid', email: 'admin@test.com' }, expires: '2025-12-31' },
  userId: 'admin-uuid',
};

describe('PUT /api/admin/whitelist-user/[id]', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  async function setup() {
    const { requireAdmin } = await import('@/lib/auth-helpers');
    const { updateWhitelistedUser } = await import('@/server/utils/queries/userQueries');
    const { PUT } = await import('../route');
    return { PUT, mockRequireAdmin: requireAdmin, mockUpdateWhitelistedUser: updateWhitelistedUser };
  }

  it('returns 401 when not authenticated', async () => {
    const { PUT, mockRequireAdmin } = await setup();
    mockRequireAdmin.mockResolvedValue({
      authenticated: false,
      response: Response.json({ error: 'Not authenticated' }, { status: 401 }),
    });

    const response = await PUT(createRequest({ isAdmin: true }), { params: Promise.resolve({ id: 'user-1' }) });
    expect(response.status).toBe(401);
  });

  it('returns 403 when non-admin tries to update', async () => {
    const { PUT, mockRequireAdmin } = await setup();
    mockRequireAdmin.mockResolvedValue({
      authenticated: false,
      response: Response.json({ error: 'Forbidden' }, { status: 403 }),
    });

    const response = await PUT(createRequest({ isAdmin: true }), { params: Promise.resolve({ id: 'user-1' }) });
    expect(response.status).toBe(403);
  });

  it('returns 200 on successful update', async () => {
    const { PUT, mockRequireAdmin, mockUpdateWhitelistedUser } = await setup();
    mockRequireAdmin.mockResolvedValue(adminAuth);
    mockUpdateWhitelistedUser.mockResolvedValue({ status: 'success', message: 'User updated successfully' });

    const response = await PUT(
      createRequest({ username: 'newname', isWhiteListed: true }),
      { params: Promise.resolve({ id: 'user-1' }) }
    );
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe('success');
  });

  it('returns 400 when updateWhitelistedUser returns error', async () => {
    const { PUT, mockRequireAdmin, mockUpdateWhitelistedUser } = await setup();
    mockRequireAdmin.mockResolvedValue(adminAuth);
    mockUpdateWhitelistedUser.mockResolvedValue({ status: 'error', message: 'No fields to update' });

    const response = await PUT(
      createRequest({}),
      { params: Promise.resolve({ id: 'user-1' }) }
    );
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.status).toBe('error');
  });

  it('returns 500 on unexpected error', async () => {
    const { PUT, mockRequireAdmin } = await setup();
    mockRequireAdmin.mockRejectedValue(new Error('DB exploded'));

    const response = await PUT(createRequest({ isAdmin: true }), { params: Promise.resolve({ id: 'user-1' }) });
    expect(response.status).toBe(500);
  });
});
