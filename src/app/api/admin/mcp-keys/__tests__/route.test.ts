// @ts-nocheck

import { jest } from '@jest/globals';

// Mock dependencies BEFORE dynamic imports
jest.mock('@/lib/auth-helpers', () => ({ requireAdmin: jest.fn() }));

jest.mock('@/server/utils/queries/mcpKeyQueries', () => ({
  getAllMcpKeys: jest.fn(),
}));

jest.mock('@/server/db/drizzle', () => {
  const mockValues = jest.fn().mockResolvedValue(undefined);
  const mockInsert = jest.fn().mockReturnValue({ values: mockValues });

  return {
    db: {
      insert: mockInsert,
      query: {},
    },
  };
});

jest.mock('@/app/api/mcp/auth', () => ({
  hashApiKey: jest.fn().mockReturnValue('mockedhash1234567890abcdef'),
}));

// Polyfill Response.json for test environment
if (!('json' in Response)) {
  Response.json = (data, init) =>
    new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
      status: init?.status || 200,
    });
}

describe('GET /api/admin/mcp-keys', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  async function setup() {
    const { requireAdmin } = await import('@/lib/auth-helpers');
    const { getAllMcpKeys } = await import('@/server/utils/queries/mcpKeyQueries');
    const { GET } = await import('../route');
    return {
      GET,
      mockRequireAdmin: requireAdmin as jest.Mock,
      mockGetAllMcpKeys: getAllMcpKeys as jest.Mock,
    };
  }

  it('returns 401 when not authenticated', async () => {
    const { GET, mockRequireAdmin } = await setup();
    mockRequireAdmin.mockResolvedValue({
      authenticated: false,
      response: Response.json({ error: 'Not authenticated' }, { status: 401 }),
    });

    const response = await GET();
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Not authenticated');
  });

  it('returns 403 when non-admin', async () => {
    const { GET, mockRequireAdmin } = await setup();
    mockRequireAdmin.mockResolvedValue({
      authenticated: false,
      response: Response.json({ error: 'Forbidden' }, { status: 403 }),
    });

    const response = await GET();
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Forbidden');
  });

  it('returns list of keys', async () => {
    const { GET, mockRequireAdmin, mockGetAllMcpKeys } = await setup();
    mockRequireAdmin.mockResolvedValue({
      authenticated: true,
      session: { user: { id: 'admin-uuid' } },
      userId: 'admin-uuid',
    });

    const mockKeys = [
      {
        id: 'key-1',
        label: 'test-agent',
        keyHashPrefix: 'abcdef12',
        createdAt: '2025-01-01T00:00:00Z',
        revokedAt: null,
      },
    ];
    mockGetAllMcpKeys.mockResolvedValue(mockKeys);

    const response = await GET();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveLength(1);
    expect(data[0].keyHashPrefix).toBe('abcdef12');
    expect(data[0].label).toBe('test-agent');
  });
});

describe('POST /api/admin/mcp-keys', () => {
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

  const adminAuth = {
    authenticated: true,
    session: { user: { id: 'admin-uuid' } },
    userId: 'admin-uuid',
  };

  const createRequest = (body: any) =>
    new Request('http://localhost/api/admin/mcp-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  it('returns 401 when not authenticated', async () => {
    const { POST, mockRequireAdmin } = await setup();
    mockRequireAdmin.mockResolvedValue({
      authenticated: false,
      response: Response.json({ error: 'Not authenticated' }, { status: 401 }),
    });

    const response = await POST(createRequest({ label: 'test' }));
    expect(response.status).toBe(401);
  });

  it('returns 400 when label is missing', async () => {
    const { POST, mockRequireAdmin } = await setup();
    mockRequireAdmin.mockResolvedValue(adminAuth);

    const response = await POST(createRequest({}));
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Label is required');
  });

  it('returns 400 when label is empty string', async () => {
    const { POST, mockRequireAdmin } = await setup();
    mockRequireAdmin.mockResolvedValue(adminAuth);

    const response = await POST(createRequest({ label: '   ' }));
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Label is required');
  });

  it('returns 201 with raw key on success', async () => {
    const { POST, mockRequireAdmin, db } = await setup();
    mockRequireAdmin.mockResolvedValue(adminAuth);

    const mockValues = jest.fn().mockResolvedValue(undefined);
    db.insert.mockReturnValue({ values: mockValues });

    const response = await POST(createRequest({ label: '  my-agent  ' }));
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.rawKey).toBeDefined();
    expect(typeof data.rawKey).toBe('string');
    expect(data.rawKey.length).toBe(64); // 32 bytes hex
    expect(data.label).toBe('my-agent'); // trimmed
  });

  it('calls db.insert with hashed key', async () => {
    const { POST, mockRequireAdmin, db } = await setup();
    mockRequireAdmin.mockResolvedValue(adminAuth);

    const mockValues = jest.fn().mockResolvedValue(undefined);
    db.insert.mockReturnValue({ values: mockValues });

    await POST(createRequest({ label: 'test-key' }));

    expect(db.insert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'test-key',
        keyHash: expect.any(String),
      })
    );
  });
});
