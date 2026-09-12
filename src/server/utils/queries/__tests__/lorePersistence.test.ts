// @ts-nocheck
import { jest } from '@jest/globals';

describe('Lore publication ownership fence', () => {
    beforeEach(() => jest.resetModules());
    async function setup(claimId, job = { id: 'j1' }) {
        const { db } = await import('@/server/db/drizzle');
        const upsert = jest.fn().mockResolvedValue(undefined);
        const values = jest.fn(() => ({ onConflictDoUpdate: upsert }));
        const tx = {
            execute: jest.fn().mockResolvedValue([]),
            query: {
                artistClaims: { findFirst: jest.fn().mockResolvedValue(claimId ? { id: claimId } : undefined) },
                artistResearchJobs: { findFirst: jest.fn().mockResolvedValue(job) },
            },
            insert: jest.fn(() => ({ values })),
        };
        db.transaction = jest.fn(fn => fn(tx));
        const { persistRefreshedLore } = await import('../lorePersistence');
        return { persistRefreshedLore, tx, values, upsert };
    }
    it.each([null, 'replacement-claim'])('rejects a snapshot from a revoked claim when current claim is %s', async current => {
        const { persistRefreshedLore, tx } = await setup(current);
        expect(await persistRefreshedLore('a1', 'Old owner doc', [], 'old-claim', 'j1')).toBe(false);
        expect(tx.insert).not.toHaveBeenCalled();
    });
    it('rejects a cancelled job even if the worker starts after revocation and sees no claim', async () => {
        const { persistRefreshedLore, tx } = await setup(null, undefined);
        tx.query.artistResearchJobs.findFirst.mockResolvedValue(undefined);
        expect(await persistRefreshedLore('a1', 'Stale doc', [], null, 'deleted-job')).toBe(false);
        expect(tx.insert).not.toHaveBeenCalled();
    });
    it('atomically stores content and citations after the shared revocation lock and checks', async () => {
        const { persistRefreshedLore, tx, values, upsert } = await setup('current-claim');
        const sources = [{ id: 1, label: 'PDF' }];
        expect(await persistRefreshedLore('a1', 'New doc', sources, 'current-claim', 'j1')).toBe(true);
        expect(tx.execute.mock.invocationCallOrder[0]).toBeLessThan(tx.query.artistClaims.findFirst.mock.invocationCallOrder[0]);
        expect(tx.query.artistResearchJobs.findFirst.mock.invocationCallOrder[0]).toBeLessThan(values.mock.invocationCallOrder[0]);
        expect(values).toHaveBeenCalledWith({ artistId: 'a1', content: 'New doc', sources, loreSummary: null });
        expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ set: expect.objectContaining({ content: 'New doc', sources }) }));
    });
});
