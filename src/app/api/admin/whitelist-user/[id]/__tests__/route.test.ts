// @ts-nocheck

import { jest } from '@jest/globals';

// Mock modules at the top level
jest.mock('@/server/auth', () => ({
  getServerAuthSession: jest.fn(),
}));

jest.mock('@/server/utils/queries/userQueries', () => ({
  getUserById: jest.fn(),
  updateWhitelistedUser: jest.fn(),
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
  new Request('http://localhost/api/admin/whitelist-user/test-user-id', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const adminSession = {
  user: { id: 'admin-uuid', email: 'admin@test.com' },
  expires: '2025-12-31',
};

const regularSession = {
  user: { id: 'regular-uuid', email: 'user@test.com' },
  expires: '2025-12-31',
};

describe('PUT /api/admin/whitelist-user/[id]', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  // Helper to get freshly imported mocks and route handler
  async function setup() {
    const { getServerAuthSession } = await import('@/server/auth');
    const { getUserById, updateWhitelistedUser } = await import(
      '@/server/utils/queries/userQueries'
    );
    const { PUT } = await import('../route');

    return {
      PUT,
      mockGetSession: getServerAuthSession as jest.Mock,
      mockGetUserById: getUserById as jest.Mock,
      mockUpdateWhitelistedUser: updateWhitelistedUser as jest.Mock,
    };
  }

  const paramsPromise = Promise.resolve({ id: 'target-user-id' });

  it('returns 401 when not authenticated', async () => {
    const { PUT, mockGetSession } = await setup();
    mockGetSession.mockResolvedValue(null);

    const response = await PUT(
      createRequest({ isWhiteListed: true }),
      { params: paramsPromise }
    );

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Not authenticated');
  });

  it('returns 403 when non-admin tries to update', async () => {
    const { PUT, mockGetSession, mockGetUserById } = await setup();
    mockGetSession.mockResolvedValue(regularSession);
    mockGetUserById.mockResolvedValue({ id: 'regular-uuid', isAdmin: false });

    const response = await PUT(
      createRequest({ isWhiteListed: true }),
      { params: paramsPromise }
    );

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Forbidden');
  });

  it('returns 200 on successful update', async () => {
    const { PUT, mockGetSession, mockGetUserById, mockUpdateWhitelistedUser } =
      await setup();
    mockGetSession.mockResolvedValue(adminSession);
    mockGetUserById.mockResolvedValue({ id: 'admin-uuid', isAdmin: true });
    mockUpdateWhitelistedUser.mockResolvedValue({
      status: 'success',
      message: 'User updated successfully',
    });

    const response = await PUT(
      createRequest({ isWhiteListed: true, username: 'newname' }),
      { params: paramsPromise }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.message).toBe('User updated successfully');
    expect(mockUpdateWhitelistedUser).toHaveBeenCalledWith('target-user-id', {
      wallet: undefined,
      email: undefined,
      username: 'newname',
      isAdmin: undefined,
      isWhiteListed: true,
      isHidden: undefined,
    });
  });

  it('returns 400 when updateWhitelistedUser returns error status', async () => {
    const { PUT, mockGetSession, mockGetUserById, mockUpdateWhitelistedUser } =
      await setup();
    mockGetSession.mockResolvedValue(adminSession);
    mockGetUserById.mockResolvedValue({ id: 'admin-uuid', isAdmin: true });
    mockUpdateWhitelistedUser.mockResolvedValue({
      status: 'error',
      message: 'No fields to update',
    });

    const response = await PUT(
      createRequest({}),
      { params: paramsPromise }
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('No fields to update');
  });

  it('returns 500 on unexpected error', async () => {
    const { PUT, mockGetSession, mockGetUserById, mockUpdateWhitelistedUser } =
      await setup();
    mockGetSession.mockResolvedValue(adminSession);
    mockGetUserById.mockResolvedValue({ id: 'admin-uuid', isAdmin: true });
    mockUpdateWhitelistedUser.mockRejectedValue(new Error('DB connection failed'));

    const response = await PUT(
      createRequest({ isWhiteListed: true }),
      { params: paramsPromise }
    );

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Internal server error');
  });
});
