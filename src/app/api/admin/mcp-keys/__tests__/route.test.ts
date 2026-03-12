// @ts-nocheck

import { jest } from '@jest/globals';

// Mock modules at the top level
jest.mock('@/server/auth', () => ({
  getServerAuthSession: jest.fn(),
}));

jest.mock('@/server/utils/queries/userQueries', () => ({
  getUserById: jest.fn(),
}));

jest.mock('@/server/db/drizzle', () => {
  const mockInsert = jest.fn();
  const mockValues = jest.fn().mockResolvedValue(undefined);
  mockInsert.mockReturnValue({ values: mockValues });

  const mockSelect = jest.fn();
  const mockFrom = jest.fn();
  const mockOrderBy = jest.fn();
  mockSelect.mockReturnValue({ from: mockFrom });
  mockFrom.mockReturnValue({ orderBy: mockOrderBy });
  mockOrderBy.mockResolvedValue([]);

  return {
    db: {
      insert: mockInsert,
      select: mockSelect,
      query: {
        mcpApiKeys: { findFirst: jest.fn(), findMany: jest.fn() },
      },
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

const adminSession = {
  user: { id: 'admin-uuid', email: 'admin@test.com' },
  expires: '2025-12-31',
};

describe('GET /api/admin/mcp-keys', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  async function setup() {
    const { getServerAuthSession } = await import('@/server/auth');
    const { getUserById } = await import('@/server/utils/queries/userQueries');
    const { db } = await import('@/server/db/drizzle');
    const { GET } = await import('../route');
    return {
      GET,
      db,
      mockGetSession: getServerAuthSession as jest.Mock,
      mockGetUserById: getUserById as jest.Mock,
    };
  }

  it('returns 401 when not authenticated', async () => {
    const { GET, mockGetSession } = await setup();
    mockGetSession.mockResolvedValue(null);

    const response = await GET();
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Not authenticated');
  });

  it('returns 403 when non-admin tries to list keys', async () => {
    const { GET, mockGetSession, mockGetUserById } = await setup();
    mockGetSession.mockResolvedValue({ user: { id: 'user-uuid' }, expires: '2025-12-31' });
    mockGetUserById.mockResolvedValue({ id: 'user-uuid', isAdmin: false });

    const response = await GET();
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Forbidden');
  });

  it('returns list of keys with truncated hash prefixes', async () => {
    const { GET, mockGetSession, mockGetUserById, db } = await setup();
    mockGetSession.mockResolvedValue(adminSession);
    mockGetUserById.mockResolvedValue({ id: 'admin-uuid', isAdmin: true });

    const mockKeys = [
      {
        id: 'key-1',
        label: 'test-agent',
        keyHashPrefix: 'abcdef1234567890fullhashvalue',
        createdAt: '2025-01-01T00:00:00Z',
        revokedAt: null,
      },
    ];

    // Chain: db.select().from().orderBy()
    const mockOrderBy = jest.fn().mockResolvedValue(mockKeys);
    const mockFrom = jest.fn().mockReturnValue({ orderBy: mockOrderBy });
    db.select.mockReturnValue({ from: mockFrom });

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
    const { getServerAuthSession } = await import('@/server/auth');
    const { getUserById } = await import('@/server/utils/queries/userQueries');
    const { db } = await import('@/server/db/drizzle');
    const { POST } = await import('../route');
    return {
      POST,
      db,
      mockGetSession: getServerAuthSession as jest.Mock,
      mockGetUserById: getUserById as jest.Mock,
    };
  }

  const createRequest = (body: any) =>
    new Request('http://localhost/api/admin/mcp-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  it('returns 401 when not authenticated', async () => {
    const { POST, mockGetSession } = await setup();
    mockGetSession.mockResolvedValue(null);

    const response = await POST(createRequest({ label: 'test' }));
    expect(response.status).toBe(401);
  });

  it('returns 400 when label is missing', async () => {
    const { POST, mockGetSession, mockGetUserById } = await setup();
    mockGetSession.mockResolvedValue(adminSession);
    mockGetUserById.mockResolvedValue({ id: 'admin-uuid', isAdmin: true });

    const response = await POST(createRequest({}));
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Label is required');
  });

  it('returns 400 when label is empty string', async () => {
    const { POST, mockGetSession, mockGetUserById } = await setup();
    mockGetSession.mockResolvedValue(adminSession);
    mockGetUserById.mockResolvedValue({ id: 'admin-uuid', isAdmin: true });

    const response = await POST(createRequest({ label: '   ' }));
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Label is required');
  });

  it('returns 201 with raw key on success', async () => {
    const { POST, mockGetSession, mockGetUserById, db } = await setup();
    mockGetSession.mockResolvedValue(adminSession);
    mockGetUserById.mockResolvedValue({ id: 'admin-uuid', isAdmin: true });

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
    const { POST, mockGetSession, mockGetUserById, db } = await setup();
    mockGetSession.mockResolvedValue(adminSession);
    mockGetUserById.mockResolvedValue({ id: 'admin-uuid', isAdmin: true });

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
