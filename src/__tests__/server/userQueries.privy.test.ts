// @ts-nocheck
import { jest } from '@jest/globals';
import { db } from '@/server/db/drizzle';
import {
  getUserByPrivyId,
  createUserFromPrivy,
  linkWalletToUser,
  updateUserPrivyId,
} from '@/server/utils/queries/userQueries';

describe('Privy user query functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserByPrivyId', () => {
    it('returns user when found by Privy ID', async () => {
      const mockUser = {
        id: 'user-1',
        privyUserId: 'did:privy:abc',
        email: 'test@example.com',
        wallet: null,
      };
      (db.query.users.findFirst as jest.Mock).mockResolvedValue(mockUser);

      const result = await getUserByPrivyId('did:privy:abc');

      expect(result).toEqual(mockUser);
      expect(db.query.users.findFirst).toHaveBeenCalled();
    });

    it('returns undefined when user not found', async () => {
      (db.query.users.findFirst as jest.Mock).mockResolvedValue(undefined);

      const result = await getUserByPrivyId('did:privy:nonexistent');

      expect(result).toBeUndefined();
    });

    it('throws on non-transient database error', async () => {
      (db.query.users.findFirst as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      await expect(getUserByPrivyId('did:privy:err')).rejects.toThrow('Error finding user');
    });
  });

  describe('createUserFromPrivy', () => {
    function setupInsertMock(returnValue: any) {
      const mockReturning = jest.fn().mockResolvedValue([returnValue]);
      const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });
      (db.insert as jest.Mock).mockReturnValue({ values: mockValues });
      return { mockValues, mockReturning };
    }

    it('inserts a new user with Privy data', async () => {
      const newUser = {
        id: 'new-user-1',
        privyUserId: 'did:privy:new',
        email: 'new@test.com',
        isWhiteListed: false,
        isAdmin: false,
        isSuperAdmin: false,
        isHidden: false,
      };
      const { mockValues } = setupInsertMock(newUser);

      const result = await createUserFromPrivy({
        privyUserId: 'did:privy:new',
        email: 'new@test.com',
      });

      expect(db.insert).toHaveBeenCalled();
      expect(mockValues).toHaveBeenCalledWith(expect.objectContaining({
        privyUserId: 'did:privy:new',
        email: 'new@test.com',
        isWhiteListed: false,
        isAdmin: false,
        isSuperAdmin: false,
        isHidden: false,
      }));
      expect(result).toEqual(newUser);
    });

    it('creates user without email when not provided', async () => {
      const newUser = {
        id: 'new-user-2',
        privyUserId: 'did:privy:no-email',
        email: undefined,
      };
      const { mockValues } = setupInsertMock(newUser);

      const result = await createUserFromPrivy({
        privyUserId: 'did:privy:no-email',
      });

      expect(mockValues).toHaveBeenCalledWith(expect.objectContaining({
        privyUserId: 'did:privy:no-email',
        email: undefined,
      }));
      expect(result).toEqual(newUser);
    });

    it('throws on database error', async () => {
      const mockValues = jest.fn().mockReturnValue({
        returning: jest.fn().mockRejectedValue(new Error('Duplicate key')),
      });
      (db.insert as jest.Mock).mockReturnValue({ values: mockValues });

      await expect(
        createUserFromPrivy({ privyUserId: 'did:privy:dup' })
      ).rejects.toThrow('Error creating user from Privy');
    });
  });

  describe('linkWalletToUser', () => {
    function setupUpdateMock(returnValue: any) {
      const mockReturning = jest.fn().mockResolvedValue([returnValue]);
      const mockWhere = jest.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
      (db.update as jest.Mock).mockReturnValue({ set: mockSet });
      return { mockSet, mockWhere, mockReturning };
    }

    it('updates user with lowercased wallet address', async () => {
      const updatedUser = { id: 'user-1', wallet: '0xabcdef1234567890abcdef1234567890abcdef12' };
      const { mockSet } = setupUpdateMock(updatedUser);

      const result = await linkWalletToUser(
        'user-1',
        '0xABCDEF1234567890ABCDEF1234567890ABCDEF12'
      );

      expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
        wallet: '0xabcdef1234567890abcdef1234567890abcdef12',
      }));
      expect(result).toEqual(updatedUser);
    });

    it('rejects invalid wallet address format', async () => {
      await expect(linkWalletToUser('user-1', 'not-a-wallet')).rejects.toThrow(
        'Invalid wallet address format'
      );
      expect(db.update).not.toHaveBeenCalled();
    });

    it('rejects wallet address with wrong length', async () => {
      await expect(linkWalletToUser('user-1', '0xshort')).rejects.toThrow(
        'Invalid wallet address format'
      );
    });

    it('rejects wallet address without 0x prefix', async () => {
      await expect(
        linkWalletToUser('user-1', 'abcdef1234567890abcdef1234567890abcdef12')
      ).rejects.toThrow('Invalid wallet address format');
    });
  });

  describe('updateUserPrivyId', () => {
    it('updates user with Privy ID', async () => {
      const updatedUser = { id: 'user-1', privyUserId: 'did:privy:linked' };
      const mockReturning = jest.fn().mockResolvedValue([updatedUser]);
      const mockWhere = jest.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
      (db.update as jest.Mock).mockReturnValue({ set: mockSet });

      const result = await updateUserPrivyId('user-1', 'did:privy:linked');

      expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
        privyUserId: 'did:privy:linked',
      }));
      expect(result).toEqual(updatedUser);
    });

    it('throws on database error', async () => {
      (db.update as jest.Mock).mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockRejectedValue(new Error('DB error')),
          }),
        }),
      });

      await expect(
        updateUserPrivyId('user-1', 'did:privy:err')
      ).rejects.toThrow('Error updating user Privy ID');
    });
  });
});
