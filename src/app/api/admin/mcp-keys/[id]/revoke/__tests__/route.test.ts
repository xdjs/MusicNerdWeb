// @ts-nocheck

import { jest } from '@jest/globals';

// Mock dependencies BEFORE dynamic imports
jest.mock('@/lib/auth-helpers', () => ({ requireAdmin: jest.fn() }));

jest.mock('@/server/db/drizzle', () => {
  const mockReturning = jest.fn().mockResolvedValue([]);
  const mockWhere = jest.fn().mockReturnValue({ returning: mockReturning });
  const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
  const mockUpdate = jest.fn().mockReturnValue({ set: mockSet });

  return {
    db: {
      update: mockUpdate,
      query: {},
    },
  };
});

// Polyfill Response.json for test environment
if (!('json' in Response)) {
  Response.json = (data, init) =>
    new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
      status: init?.status || 200,
    });
}

const adminAuth = {
  authenticated: true,
  session: { user: { id: 'admin-uuid' } },
  userId: 'admin-uuid',
};

describe('POST /api/admin/mcp-keys/[id]/revoke', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  async function setup() {
    const { requireAdmin } = await import('@/lib/auth-helpers');
    const { db } = await import('@/server/db/drizzle');
    const { POST } = await import('../route');
    return {
      POST,
      db,
      mockRequireAdmin: requireAdmin as jest.Mock,
    };
  }

  const paramsPromise = Promise.resolve({ id: 'key-uuid-123' });

  const createRequest = () =>
    new Request('http://localhost/api/admin/mcp-keys/key-uuid-123/revoke', {
      method: 'POST',
    });

  it('returns 401 when not authenticated', async () => {
    const { POST, mockRequireAdmin } = await setup();
    mockRequireAdmin.mockResolvedValue({
      authenticated: false,
      response: Response.json({ error: 'Not authenticated' }, { status: 401 }),
    });

    const response = await POST(createRequest(), { params: paramsPromise });
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Not authenticated');
  });

  it('returns 403 when non-admin', async () => {
    const { POST, mockRequireAdmin } = await setup();
    mockRequireAdmin.mockResolvedValue({
      authenticated: false,
      response: Response.json({ error: 'Forbidden' }, { status: 403 }),
    });

    const response = await POST(createRequest(), { params: paramsPromise });
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Forbidden');
  });

  it('returns 404 when key does not exist', async () => {
    const { POST, mockRequireAdmin, db } = await setup();
    mockRequireAdmin.mockResolvedValue(adminAuth);

    const mockReturning = jest.fn().mockResolvedValue([]);
    const mockWhere = jest.fn().mockReturnValue({ returning: mockReturning });
    const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
    db.update.mockReturnValue({ set: mockSet });

    const response = await POST(createRequest(), { params: paramsPromise });
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Key not found');
  });

  it('returns 200 on successful revoke', async () => {
    const { POST, mockRequireAdmin, db } = await setup();
    mockRequireAdmin.mockResolvedValue(adminAuth);

    const mockReturning = jest.fn().mockResolvedValue([{ id: 'key-uuid-123' }]);
    const mockWhere = jest.fn().mockReturnValue({ returning: mockReturning });
    const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
    db.update.mockReturnValue({ set: mockSet });

    const response = await POST(createRequest(), { params: paramsPromise });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.message).toBe('Key revoked');
  });

  it('returns 500 on unexpected error', async () => {
    const { POST, mockRequireAdmin, db } = await setup();
    mockRequireAdmin.mockResolvedValue(adminAuth);

    db.update.mockImplementation(() => { throw new Error('DB down'); });

    const response = await POST(createRequest(), { params: paramsPromise });
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Internal server error');
  });
});
