// @ts-nocheck
import { jest } from '@jest/globals';

describe('bio history ownership fencing', () => {
    beforeEach(() => jest.resetModules());
    async function setup(claim, admin = false) {
        const { db } = await import('@/server/db/drizzle');
        const version = { id: 'v1', bioText: 'Saved bio', isPinned: false };
        const mutation = jest.fn(() => ({ set: jest.fn(() => ({ where: jest.fn(() => ({ returning: jest.fn().mockResolvedValue([version]) })) })),
            values: jest.fn(() => ({ returning: jest.fn().mockResolvedValue([version]) })),
            where: jest.fn(() => ({ returning: jest.fn().mockResolvedValue([version]) })),
        }));
        const tx = { execute: jest.fn().mockResolvedValue([]), insert: mutation, update: mutation, delete: mutation, query: {
            artistClaims: { findFirst: jest.fn().mockResolvedValue(claim) },
            users: { findFirst: jest.fn().mockResolvedValue({ isAdmin: admin }) },
            artists: { findFirst: jest.fn().mockResolvedValue({ bio: 'Saved bio' }) },
            artistBioVersions: { findFirst: jest.fn().mockResolvedValue(version), findMany: jest.fn().mockResolvedValue([]) },
        } };
        db.transaction = jest.fn(fn => fn(tx));
        const q = await import('../dashboardQueries');
        const operations = {
            save: auth => q.saveBioVersion('a1', 'New bio', auth),
            pin: auth => q.pinBioVersion('v1', 'a1', auth),
            delete: auth => q.deleteBioVersion('v1', 'a1', auth),
            unpin: auth => q.unpinArtistBio('a1', auth),
        };
        return { tx, mutation, operations };
    }
    it.each(['save', 'pin', 'delete', 'unpin'])('%s rejects a replaced claim before any mutation', async operation => {
        const { tx, mutation, operations } = await setup({ id: 'new-claim', userId: 'new-owner' });
        await expect(operations[operation]({ userId: 'old-owner', expectedClaimId: 'old-claim' })).rejects.toThrow('ownership changed');
        expect(mutation).not.toHaveBeenCalled();
        expect(tx.execute.mock.invocationCallOrder[0]).toBeLessThan(tx.query.artistClaims.findFirst.mock.invocationCallOrder[0]);
    });
    it.each(['save', 'pin', 'delete', 'unpin'])('%s permits the current owner after locked authorization', async operation => {
        const { tx, mutation, operations } = await setup({ id: 'claim', userId: 'owner' });
        await operations[operation]({ userId: 'owner', expectedClaimId: 'claim' });
        expect(mutation).toHaveBeenCalled();
        expect(tx.query.artistClaims.findFirst.mock.invocationCallOrder[0]).toBeLessThan(mutation.mock.invocationCallOrder[0]);
    });
    it('rejects a removed claim, including same-owner reclaims with a different generation', async () => {
        const { mutation, operations } = await setup(undefined);
        await expect(operations.unpin({ userId: 'owner', expectedClaimId: 'old-claim' })).rejects.toThrow('ownership changed');
        expect(mutation).not.toHaveBeenCalled();
    });
    it('allows an active admin but rejects a removed admin role on an unclaimed artist', async () => {
        const { operations, tx, mutation } = await setup(undefined, true);
        await operations.unpin({ userId: 'admin', expectedClaimId: null });
        mutation.mockClear();
        tx.query.users.findFirst.mockResolvedValue({ isAdmin: false });
        await expect(operations.unpin({ userId: 'admin', expectedClaimId: null })).rejects.toThrow('ownership changed');
        expect(mutation).not.toHaveBeenCalled();
    });
});
