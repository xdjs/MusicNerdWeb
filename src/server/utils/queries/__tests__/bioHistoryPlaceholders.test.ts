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
            query: { artistBioProvenance:{findFirst:jest.fn().mockResolvedValue(undefined)},artistBioVersionProvenance:{findFirst:jest.fn().mockResolvedValue(undefined),findMany:jest.fn().mockResolvedValue([])}, artistClaims: claims(), artistBioVersions: { findFirst: jest.fn().mockResolvedValue(pinned) }, artists: { findFirst: jest.fn().mockResolvedValue({ bio: ` ${ABOUT_EMPTY_STATE} ` }) } },
            delete:jest.fn(()=>({where:jest.fn().mockResolvedValue(undefined)})), insert: jest.fn(), update: jest.fn(() => ({ set: jest.fn(() => ({ where })) })),
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
            artistBioProvenance:{findFirst:jest.fn().mockResolvedValue(undefined)},artistBioVersionProvenance:{findFirst:jest.fn().mockResolvedValue(undefined),findMany:jest.fn().mockResolvedValue([])},
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
    const values=jest.fn(()=>({returning:jest.fn().mockResolvedValue([{id:"history-id"}]),onConflictDoUpdate:jest.fn().mockResolvedValue(undefined)}));
    const set=jest.fn(()=>({where:jest.fn(()=>({returning:jest.fn().mockResolvedValue([selected])}))}));
    const currentProvenance={version:1,kind:'unknown',bioHash:'current'};
    const tx={execute:jest.fn().mockResolvedValue([]),query:{artistBioProvenance:{findFirst:jest.fn().mockResolvedValue({provenance:currentProvenance})},artistBioVersionProvenance:{findFirst:jest.fn().mockResolvedValue(provenance == null ? undefined : {provenance})},artistClaims:claims(),artists:{findFirst:jest.fn().mockResolvedValue({bio:'Current',bioProvenance:currentProvenance})},artistBioVersions:{findFirst:jest.fn().mockResolvedValueOnce(selected).mockResolvedValue(undefined)}},delete:jest.fn(()=>({where:jest.fn().mockResolvedValue(undefined)})),insert:jest.fn(()=>({values})),update:jest.fn(()=>({set}))};
    db.transaction=jest.fn(fn=>fn(tx));
    const {pinBioVersion}=await import('../dashboardQueries');
    await pinBioVersion('v1','a1',auth);
    expect(values).toHaveBeenCalledWith({artistId:'a1',bioText:'Current',isPinned:false});
    expect(set).toHaveBeenCalledWith({bio:'Selected'});
    expect(values).toHaveBeenCalledWith({versionId:'history-id',provenance:currentProvenance});
    if(provenance) expect(values).toHaveBeenCalledWith({artistId:'a1',provenance});
    else expect(tx.delete).toHaveBeenCalled();
});
it('explicit deduplicated history save prepares receipts before returning existing version',async()=>{
 jest.resetModules();const {db}=await import('@/server/db/drizzle');
 const url='https://example.com/source';const lineage={version:1,kind:'generated',bioHash:'hash',claimId:'claim-1',sources:[{url}]};
 const saved={id:'v1',bioText:'Current bio'};
 const execute=jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([{url_hex:Buffer.from(url).toString('hex')}]);
 const tx={execute,insert:jest.fn(),query:{artistClaims:claims(),artists:{findFirst:jest.fn().mockResolvedValue({bio:saved.bioText})},artistBioVersions:{findMany:jest.fn().mockResolvedValue([saved])},artistBioProvenance:{findFirst:jest.fn().mockResolvedValue({provenance:lineage})},artistBioVersionProvenance:{findMany:jest.fn().mockResolvedValue([{versionId:'v1',provenance:lineage}])}}};
 db.transaction=jest.fn(fn=>fn(tx));const {saveBioVersion}=await import('../dashboardQueries');
 expect(await saveBioVersion('a1',saved.bioText,auth)).toBe(saved);expect(execute).toHaveBeenCalledTimes(3);expect(tx.insert).not.toHaveBeenCalled();
});
it('pin failure preparing selected receipts prevents current text overwrite',async()=>{
 jest.resetModules();const {db}=await import('@/server/db/drizzle');
 const selected={id:'v1',bioText:'Selected'};
 const selectedLineage={version:1,kind:'generated',bioHash:'hash',claimId:'claim-1',sources:[{url:'https://example.com/source'}]};
 const where=jest.fn(()=>({returning:jest.fn().mockResolvedValue([selected])}));const set=jest.fn(()=>({where}));
 const tx={execute:jest.fn().mockResolvedValueOnce([]).mockRejectedValue(new Error('URL parameter private')),query:{artistClaims:claims(),artists:{findFirst:jest.fn().mockResolvedValue({bio:null})},artistBioVersions:{findFirst:jest.fn().mockResolvedValue(selected)},artistBioProvenance:{findFirst:jest.fn().mockResolvedValue(undefined)},artistBioVersionProvenance:{findFirst:jest.fn().mockResolvedValue({provenance:selectedLineage})}},update:jest.fn(()=>({set})),insert:jest.fn()};
 db.transaction=jest.fn(fn=>fn(tx));const {pinBioVersion}=await import('../dashboardQueries');
 await expect(pinBioVersion('v1','a1',auth)).rejects.toThrow('URL receipt could not be stored or verified');
 expect(set).not.toHaveBeenCalledWith({bio:'Selected'});expect(tx.insert).not.toHaveBeenCalled();
});
it('explicit unchanged bio edit prepares current receipts before the no-op return',async()=>{
 jest.resetModules();const {db}=await import('@/server/db/drizzle');
 const url='https://example.com/source';const provenance={version:1,kind:'authored',bioHash:'hash',claimId:'claim-1',sources:[{url}]};
 const execute=jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([{url_hex:Buffer.from(url).toString('hex')}]);
 const tx={execute,insert:jest.fn(),update:jest.fn(),query:{artistClaims:claims(),artists:{findFirst:jest.fn().mockResolvedValue({bio:'Unchanged'})},artistBioVersions:{findFirst:jest.fn().mockResolvedValue(undefined)},artistBioProvenance:{findFirst:jest.fn().mockResolvedValue({provenance})}}};
 db.transaction=jest.fn(fn=>fn(tx));const {persistArtistBio}=await import('../bioPersistence');
 expect(await persistArtistBio('a1','Unchanged',{ownership:auth})).toBe('Unchanged');expect(execute).toHaveBeenCalledTimes(3);expect(tx.update).not.toHaveBeenCalled();
});
it('explicit pinned unchanged edit prepares both existing manifests without rewriting text',async()=>{
 jest.resetModules();const {db}=await import('@/server/db/drizzle');
 const url='https://example.com/source';const provenance={version:1,kind:'generated',bioHash:'hash',claimId:'claim-1',sources:[{url}]};
 const execute=jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([{url_hex:Buffer.from(url).toString('hex')}]).mockResolvedValueOnce([]).mockResolvedValueOnce([{url_hex:Buffer.from(url).toString('hex')}]);
 const tx={execute,insert:jest.fn(),update:jest.fn(),query:{artistClaims:claims(),artists:{findFirst:jest.fn().mockResolvedValue({bio:'Pinned'})},artistBioVersions:{findFirst:jest.fn().mockResolvedValue({id:'v1',bioText:'Pinned',isPinned:true})},artistBioProvenance:{findFirst:jest.fn().mockResolvedValue({provenance})},artistBioVersionProvenance:{findFirst:jest.fn().mockResolvedValue({provenance})}}};
 db.transaction=jest.fn(fn=>fn(tx));const {persistArtistBio}=await import('../bioPersistence');
 expect(await persistArtistBio('a1','Pinned',{ownership:auth})).toBe('Pinned');expect(execute).toHaveBeenCalledTimes(5);expect(tx.update).not.toHaveBeenCalled();
});
