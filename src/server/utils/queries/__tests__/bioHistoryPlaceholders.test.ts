// @ts-nocheck
import { jest } from '@jest/globals';

describe('bio history placeholder exclusions', () => {
    beforeEach(() => jest.resetModules());
    it('pinning history does not snapshot the public empty-state prompt', async () => {
        const { db } = await import('@/server/db/drizzle');
        const { ABOUT_EMPTY_STATE } = await import('@/lib/bioConstants');
        const pinned = { id: 'v1', bioText: 'Real saved bio' };
        const where = jest.fn(() => ({ returning: jest.fn().mockResolvedValue([pinned]) }));
        const tx = { execute: jest.fn().mockResolvedValue([]),
            query: { artistBioVersions: { findFirst: jest.fn().mockResolvedValue(pinned) }, artists: { findFirst: jest.fn().mockResolvedValue({ bio: ` ${ABOUT_EMPTY_STATE} ` }) } },
            insert: jest.fn(), update: jest.fn(() => ({ set: jest.fn(() => ({ where })) })),
        };
        db.transaction = jest.fn(fn => fn(tx));
        const { pinBioVersion } = await import('../dashboardQueries');
        expect(await pinBioVersion('v1', 'a1')).toEqual(pinned);
        expect(tx.insert).not.toHaveBeenCalled();
    });
    it('explicit save rejects the empty-state prompt instead of consuming history capacity', async () => {
        const { db } = await import('@/server/db/drizzle');
        db.transaction = jest.fn();
        const { ABOUT_EMPTY_STATE } = await import('@/lib/bioConstants');
        const { saveBioVersion } = await import('../dashboardQueries');
        await expect(saveBioVersion('a1', ABOUT_EMPTY_STATE)).rejects.toThrow('Write a bio');
        expect(db.transaction).not.toHaveBeenCalled();
    });
});
