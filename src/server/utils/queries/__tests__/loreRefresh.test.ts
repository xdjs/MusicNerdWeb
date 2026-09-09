// @ts-nocheck
import { jest } from '@jest/globals';

describe('Lore queue claim generation', () => {
    beforeEach(() => jest.resetModules());
    async function setup(claim) {
        const { db } = await import('@/server/db/drizzle');
        const tx = { execute: jest.fn().mockResolvedValue([]), query: { artistClaims: { findFirst: jest.fn().mockResolvedValue(claim) } } };
        db.transaction = jest.fn(fn => fn(tx));
        const { queueLoreRefresh } = await import('../loreRefresh');
        return { queueLoreRefresh, tx };
    }
    it.each([undefined, { id: 'replacement' }])('does not enqueue an old action after revocation or replacement', async claim => {
        const { queueLoreRefresh, tx } = await setup(claim);
        await expect(queueLoreRefresh('a1', 'old-claim')).rejects.toThrow('ownership changed');
        expect(tx.execute).toHaveBeenCalledTimes(1); // lock only, no INSERT
    });
    it('locks and stores the validated claim identity with the requested job', async () => {
        const { queueLoreRefresh, tx } = await setup({ id: 'claim-1' });
        await queueLoreRefresh('a1', 'claim-1');
        expect(tx.execute.mock.invocationCallOrder[0]).toBeLessThan(tx.query.artistClaims.findFirst.mock.invocationCallOrder[0]);
        expect(tx.query.artistClaims.findFirst.mock.invocationCallOrder[0]).toBeLessThan(tx.execute.mock.invocationCallOrder[1]);
        const { PgDialect } = await import('drizzle-orm/pg-core');
        const query = new PgDialect().sqlToQuery(tx.execute.mock.calls[1][0]);
        expect(query.params).toContain(JSON.stringify({ claimId: 'claim-1' }));
    });
});
