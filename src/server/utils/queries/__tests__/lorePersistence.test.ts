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

    it('keeps the last good overview on failure but shows it only for its current inventory', async () => {
        const { persistRefreshedLore, upsert } = await setup('current-claim');
        const { currentLoreSummary, loreSourceKey } = await import('@/lib/loreSummary');
        const approved = [{ id: 'source-1', title: 'Studio journal', type: 'document' }];
        const stored = { content: 'Old document', loreSummary: { text: 'A studio journal.', sourceKey: loreSourceKey(approved) } };
        upsert.mockImplementation(async ({ set }) => { Object.assign(stored, set); });
        await persistRefreshedLore('a1', 'Refreshed document', [], 'current-claim', 'j1', undefined);
        expect(stored.content).toBe('Refreshed document');
        expect(currentLoreSummary(stored.loreSummary, approved)).toBe('A studio journal.');
        expect(currentLoreSummary(stored.loreSummary, [{ ...approved[0], title: 'Renamed journal' }])).toBeNull();
        expect(currentLoreSummary(stored.loreSummary, [])).toBeNull();
    });

    it.each([null, { text: 'New overview.', sourceKey: 'new-inventory' }])('applies an explicit clear or replacement: %j', async summary => {
        const { persistRefreshedLore, upsert } = await setup('current-claim');
        const stored = { loreSummary: { text: 'Previous overview.', sourceKey: 'old-inventory' } };
        upsert.mockImplementation(async ({ set }) => { Object.assign(stored, set); });
        await persistRefreshedLore('a1', 'Refreshed document', [], 'current-claim', 'j1', summary);
        expect(stored.loreSummary).toEqual(summary);
    });
});
