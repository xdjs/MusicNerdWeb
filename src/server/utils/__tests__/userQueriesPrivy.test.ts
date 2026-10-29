// @ts-nocheck

import { jest } from '@jest/globals';

// Mock drizzle-orm operators
jest.mock('drizzle-orm', () => ({
  eq: jest.fn((col, val) => ({ col, val, type: 'eq' })),
  ilike: jest.fn((col, val) => ({ col, val, type: 'ilike' })),
  inArray: jest.fn((col, val) => ({ col, val, type: 'inArray' })),
  sql: jest.fn((...args) => args),
}));

// Mock the schema
jest.mock('@/server/db/schema', () => ({
  users: {
    id: 'users.id',
    email: 'users.email',
    wallet: 'users.wallet',
    privyUserId: 'users.privyUserId',
    isWhiteListed: 'users.isWhiteListed',
    isAdmin: 'users.isAdmin',
    isSuperAdmin: 'users.isSuperAdmin',
    isHidden: 'users.isHidden',
    username: 'users.username',
    updatedAt: 'users.updatedAt',
    acceptedUgcCount: 'users.acceptedUgcCount',
  },
}));

const mockTx = {
  query: {
    users: {
      findFirst: jest.fn(),
    },
  },
  update: jest.fn().mockReturnValue({
    set: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        returning: jest.fn(),
      }),
    }),
  }),
  delete: jest.fn().mockReturnValue({
    where: jest.fn(),
  }),
  execute: jest.fn(),
};

jest.mock('@/server/db/drizzle', () => ({
  db: {
    query: {
      users: {
        findFirst: jest.fn(),
      },
    },
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn(),
      }),
    }),
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn(),
        }),
      }),
    }),
    delete: jest.fn().mockReturnValue({
      where: jest.fn(),
    }),
    transaction: jest.fn(async (callback) => callback(mockTx)),
  },
}));

// Polyfill Response.json for test environment
if (!('json' in Response)) {
  Response.json = (data, init) =>
    new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
      status: init?.status || 200,
    });
}

describe('Privy User Query Functions', () => {
  let getUserByPrivyId;
  let db;

  beforeAll(async () => {
    const mod = await import('@/server/utils/queries/userQueries');
    getUserByPrivyId = mod.getUserByPrivyId;

    const dbMod = await import('@/server/db/drizzle');
    db = dbMod.db;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset chainable mocks
    db.query.users.findFirst.mockReset();
    db.insert.mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn(),
      }),
    });
    db.update.mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn(),
        }),
      }),
    });
  });

  describe('getUserByPrivyId', () => {
    it('returns user when found', async () => {
      const mockUser = { id: 'uuid', privyUserId: 'did:privy:123', email: 'test@test.com' };
      db.query.users.findFirst.mockResolvedValue(mockUser);

      const result = await getUserByPrivyId('did:privy:123');

      expect(db.query.users.findFirst).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('returns undefined when user not found', async () => {
      db.query.users.findFirst.mockResolvedValue(undefined);

      const result = await getUserByPrivyId('did:privy:nonexistent');

      expect(result).toBeUndefined();
    });

    it('throws on database error', async () => {
      db.query.users.findFirst.mockRejectedValue(new Error('Connection refused'));

      await expect(getUserByPrivyId('did:privy:123')).rejects.toThrow('Error finding user');
    });
  });
});
