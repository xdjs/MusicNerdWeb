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

// Mock getServerAuthSession
jest.mock('@/server/auth', () => ({
  getServerAuthSession: jest.fn(),
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
  let createUserFromPrivy;
  let updateUserPrivyId;
  let db;

  beforeAll(async () => {
    const mod = await import('@/server/utils/queries/userQueries');
    getUserByPrivyId = mod.getUserByPrivyId;
    createUserFromPrivy = mod.createUserFromPrivy;
    updateUserPrivyId = mod.updateUserPrivyId;

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

  describe('createUserFromPrivy', () => {
    it('inserts user with privyUserId and email, all flags false', async () => {
      const newUser = {
        id: 'new-uuid',
        privyUserId: 'did:privy:new',
        email: 'new@test.com',
        isWhiteListed: false,
        isAdmin: false,
        isSuperAdmin: false,
        isHidden: false,
      };

      const mockReturningFn = jest.fn().mockResolvedValue([newUser]);
      const mockValuesFn = jest.fn().mockReturnValue({ returning: mockReturningFn });
      db.insert.mockReturnValue({ values: mockValuesFn });

      const result = await createUserFromPrivy({
        privyUserId: 'did:privy:new',
        email: 'new@test.com',
      });

      expect(db.insert).toHaveBeenCalled();
      expect(mockValuesFn).toHaveBeenCalledWith({
        privyUserId: 'did:privy:new',
        email: 'new@test.com',
        username: null,
        isWhiteListed: false,
        isAdmin: false,
        isSuperAdmin: false,
        isHidden: false,
      });
      expect(result).toEqual(newUser);
    });

    it('creates user without email when not provided', async () => {
      const newUser = {
        id: 'new-uuid',
        privyUserId: 'did:privy:noemail',
        isWhiteListed: false,
        isAdmin: false,
        isSuperAdmin: false,
        isHidden: false,
      };

      const mockReturningFn = jest.fn().mockResolvedValue([newUser]);
      const mockValuesFn = jest.fn().mockReturnValue({ returning: mockReturningFn });
      db.insert.mockReturnValue({ values: mockValuesFn });

      const result = await createUserFromPrivy({
        privyUserId: 'did:privy:noemail',
      });

      expect(mockValuesFn).toHaveBeenCalledWith(
        expect.objectContaining({
          privyUserId: 'did:privy:noemail',
          email: undefined,
        })
      );
    });

    it('throws on database error', async () => {
      const mockReturningFn = jest.fn().mockRejectedValue(new Error('Unique constraint violation'));
      const mockValuesFn = jest.fn().mockReturnValue({ returning: mockReturningFn });
      db.insert.mockReturnValue({ values: mockValuesFn });

      await expect(
        createUserFromPrivy({ privyUserId: 'did:privy:dup' })
      ).rejects.toThrow('Error creating user from Privy');
    });
  });

  describe('updateUserPrivyId', () => {
    it('updates user with privyUserId and returns updated user', async () => {
      const updatedUser = { id: 'uuid', privyUserId: 'did:privy:linked' };

      const mockReturningFn = jest.fn().mockResolvedValue([updatedUser]);
      const mockWhereFn = jest.fn().mockReturnValue({ returning: mockReturningFn });
      const mockSetFn = jest.fn().mockReturnValue({ where: mockWhereFn });
      db.update.mockReturnValue({ set: mockSetFn });

      const result = await updateUserPrivyId('uuid', 'did:privy:linked');

      expect(db.update).toHaveBeenCalled();
      expect(mockSetFn).toHaveBeenCalledWith(
        expect.objectContaining({
          privyUserId: 'did:privy:linked',
        })
      );
      expect(result).toEqual(updatedUser);
    });

    it('throws on database error', async () => {
      const mockReturningFn = jest.fn().mockRejectedValue(new Error('DB error'));
      const mockWhereFn = jest.fn().mockReturnValue({ returning: mockReturningFn });
      const mockSetFn = jest.fn().mockReturnValue({ where: mockWhereFn });
      db.update.mockReturnValue({ set: mockSetFn });

      await expect(updateUserPrivyId('uuid', 'did:privy:x')).rejects.toThrow(
        'Error updating user Privy ID'
      );
    });
  });
});
