// @ts-nocheck
import { jest } from '@jest/globals';
const auth = { userId: 'owner', expectedClaimId: 'claim-1' };
const claims = () => ({ findFirst: jest.fn().mockResolvedValue({ id: 'claim-1', userId: 'owner' }) });

describe('bio history placeholder exclusions', () => {
    beforeEach(() => jest.resetModules());
    it('pinning history does not snapshot the public empty-state prompt', async () => {
        const { db } = await import('@/server/db/drizzle');
        const { ABOUT_EMPTY_STATE } = await import('@/lib/bio/bioConstants');
        const pinned = { id: 'v1', bioText: 'Real saved bio' };
        const where = jest.fn(() => ({ returning: jest.fn().mockResolvedValue([pinned]) }));
        const tx = { execute: jest.fn().mockResolvedValue([]),
            query: { artistClaims: claims(), artistBioVersions: { findFirst: jest.fn().mockResolvedValue(pinned) }, artists: { findFirst: jest.fn().mockResolvedValue({ bio: ` ${ABOUT_EMPTY_STATE} ` }) } },
            insert: jest.fn(), update: jest.fn(() => ({ set: jest.fn(() => ({ where })) })),
        };
        db.transaction = jest.fn(fn => fn(tx));
        const { pinBioVersion } = await import('../dashboardQueries');
        expect(await pinBioVersion('v1', 'a1', auth)).toEqual(pinned);
        expect(tx.insert).not.toHaveBeenCalled();
    });
    it('explicit save rejects the empty-state prompt instead of consuming history capacity', async () => {
        const { db } = await import('@/server/db/drizzle');
        db.transaction = jest.fn();
        const { ABOUT_EMPTY_STATE } = await import('@/lib/bio/bioConstants');
        const { saveBioVersion } = await import('../dashboardQueries');
        await expect(saveBioVersion('a1', ABOUT_EMPTY_STATE, auth)).rejects.toThrow('Write a bio');
        expect(db.transaction).not.toHaveBeenCalled();
    });
    it('explicit save returns the already-saved version even when history is full', async () => {
        const { db } = await import('@/server/db/drizzle');
        const saved = { id: 'existing', bioText: 'Current bio' };
        const tx = { execute: jest.fn().mockResolvedValue([]), insert: jest.fn(), query: {
            artistClaims: claims(),
            artists: { findFirst: jest.fn().mockResolvedValue({bio:"Current bio",bioProvenance:null}) },
            artistBioVersions: { findMany: jest.fn().mockResolvedValue([saved, ...Array.from({ length: 49 }, (_, i) => ({ id: String(i), bioText: `Version ${i}` }))]) },
        } };
        db.transaction = jest.fn(fn => fn(tx));
        const { saveBioVersion } = await import('../dashboardQueries');
        expect(await saveBioVersion('a1', 'Current bio', auth)).toBe(saved);
        expect(tx.insert).not.toHaveBeenCalled();
    });
});
it.each([null, {version:1,kind:'generated',bioHash:'hash',claimId:'claim',sources:[]}])('pin restores the selected provenance exactly (%j)', async provenance => {
    jest.resetModules();
    const { db } = await import('@/server/db/drizzle');
    const selected={id:'v1',bioText:'Selected',bioProvenance:provenance};
    const values=jest.fn().mockResolvedValue(undefined);
    const set=jest.fn(()=>({where:jest.fn(()=>({returning:jest.fn().mockResolvedValue([selected])}))}));
    const currentProvenance={version:1,kind:'unknown',bioHash:'current'};
    const tx={execute:jest.fn().mockResolvedValue([]),query:{artistClaims:claims(),artists:{findFirst:jest.fn().mockResolvedValue({bio:'Current',bioProvenance:currentProvenance})},artistBioVersions:{findFirst:jest.fn().mockResolvedValueOnce(selected).mockResolvedValue(undefined)}},insert:jest.fn(()=>({values})),update:jest.fn(()=>({set}))};
    db.transaction=jest.fn(fn=>fn(tx));
    const {pinBioVersion}=await import('../dashboardQueries');
    await pinBioVersion('v1','a1',auth);
    expect(values).toHaveBeenCalledWith({artistId:'a1',bioText:'Current',bioProvenance:currentProvenance,isPinned:false});
    expect(set).toHaveBeenCalledWith({bio:'Selected',bioProvenance:provenance});
});
