/** @jest-environment node */
import { drizzle } from 'drizzle-orm/pglite';
jest.mock('@/server/db/drizzle', () => ({ get db() { return database; } }));
const { PGlite } = process.getBuiltinModule('module').createRequire(__filename)('@electric-sql/pglite') as typeof import('@electric-sql/pglite');
const client = new PGlite();
const driver = drizzle(client);
// PGlite verifies the real predicate/inserts. Lock semantics remain covered by the existing test.
const database = { transaction: (cb: (tx: unknown) => unknown) => driver.transaction(async tx => cb(new Proxy(tx, {get(target,prop){ if(prop==='execute') return async()=>[]; const value=Reflect.get(target,prop); return typeof value==='function'?value.bind(target):value; }}))) };
const user='00000000-0000-4000-8000-000000000001';
const artist='00000000-0000-4000-8000-000000000002';
let submit: typeof import('../submitBioCorrection').submitBioCorrection;
beforeAll(async()=>{
 jest.resetModules();
 ({submitBioCorrection:submit}=await import('../submitBioCorrection'));
 await client.exec(`create table artist_bio_corrections (id uuid primary key default gen_random_uuid(), artist_id uuid, user_id uuid, reason text, details text, source_url text, bio_snapshot text, status text default 'pending', created_at timestamptz default now(), reviewed_at timestamptz, reviewed_by uuid)`);
},30000);
afterAll(async()=>{await client.close();});
beforeEach(async()=>{await client.exec('truncate artist_bio_corrections');});
it('saves changed details, reason and source but deduplicates an exact repeat',async()=>{
 const original={reason:'other' as const,details:'Original QA report',sourceUrl:null,expectedBio:'Same About'};
 expect(await submit(user,artist,original,'Same About')).toBe('created');
 expect(await submit(user,artist,{...original,details:'A different correction'},'Same About')).toBe('created');
 const linked={...original,sourceUrl:'https://report-test.com/'};
 expect(await submit(user,artist,linked,'Same About')).toBe('created');
 expect(await submit(user,artist,{...original,reason:'incorrect'},'Same About')).toBe('created');
 expect(await submit(user,artist,linked,'Same About')).toBe('duplicate');
 expect(await submit(user,artist,original,'Same About')).toBe('duplicate');
 const result=await client.query('select details,source_url from artist_bio_corrections');
 expect(result.rows).toHaveLength(4);
 expect(result.rows).toContainEqual({details:'Original QA report',source_url:'https://report-test.com/'});
});
