// @ts-nocheck
import { jest } from '@jest/globals';

describe('ownership-sensitive write transactions', () => {
    beforeEach(() => jest.resetModules());
    async function setup({ claim = { id: 'claim-1', userId: 'owner' }, job = { id: 'j1' }, admin = false } = {}) {
        const { db } = await import('@/server/db/drizzle');
        const tx = { execute: jest.fn().mockResolvedValue([]), query: {
            artistClaims: { findFirst: jest.fn().mockResolvedValue(claim) },
            artistResearchJobs: { findFirst: jest.fn().mockResolvedValue(job) },
            users: { findFirst: jest.fn().mockResolvedValue({ isAdmin: admin }) },
        } };
        db.transaction = jest.fn(fn => fn(tx));
        const guards = await import('../ownershipWrites');
        const write = jest.fn().mockResolvedValue('saved');
        return { ...guards, tx, write };
    }
    it.each([undefined, { id: 'new-claim', userId: 'owner' }])('rejects an upload if the original claim disappeared/replaced', async claim => {
        const s = await setup();
        s.tx.query.artistClaims.findFirst.mockResolvedValue(claim);
        await expect(s.withArtistUploadWrite('a1', 'owner', 'claim-1', s.write)).rejects.toBeInstanceOf(s.OwnershipChangedError);
        expect(s.write).not.toHaveBeenCalled();
    });
    it('rejects a revoked admin without a matching claim', async () => {
        const s = await setup({ claim: null, admin: false });
        await expect(s.withArtistUploadWrite('a1', 'former-admin', null, s.write)).rejects.toThrow('ownership changed');
        expect(s.write).not.toHaveBeenCalled();
    });
    it('allows a current owner only after taking the shared artist lock', async () => {
        const s = await setup();
        expect(await s.withArtistUploadWrite('a1', 'owner', 'claim-1', s.write)).toBe('saved');
        expect(s.tx.execute.mock.invocationCallOrder[0]).toBeLessThan(s.tx.query.artistClaims.findFirst.mock.invocationCallOrder[0]);
        expect(s.tx.query.artistClaims.findFirst.mock.invocationCallOrder[0]).toBeLessThan(s.write.mock.invocationCallOrder[0]);
        expect(s.write).toHaveBeenCalledWith(s.tx);
    });
    it('allows a current admin when claim generation is unchanged', async () => {
        const s = await setup({ claim: null, admin: true });
        expect(await s.withArtistUploadWrite('a1', 'admin', null, s.write)).toBe('saved');
    });
    it('prevents any late post/credit/child-job write after revocation deletes its job', async () => {
        const s = await setup();
        s.tx.query.artistResearchJobs.findFirst.mockResolvedValue(undefined);
        await expect(s.withResearchJobWrite('a1', 'deleted-job', s.write)).rejects.toBeInstanceOf(s.OwnershipChangedError);
        expect(s.write).not.toHaveBeenCalled();
    });
    it('passes the locked transaction to a surviving job write', async () => {
        const s = await setup();
        expect(await s.withResearchJobWrite('a1', 'j1', s.write)).toBe('saved');
        expect(s.tx.execute.mock.invocationCallOrder[0]).toBeLessThan(s.tx.query.artistResearchJobs.findFirst.mock.invocationCallOrder[0]);
        expect(s.tx.query.artistResearchJobs.findFirst.mock.invocationCallOrder[0]).toBeLessThan(s.write.mock.invocationCallOrder[0]);
        expect(s.write).toHaveBeenCalledWith(s.tx);
    });
});
