/** @jest-environment node */
import { drizzle } from 'drizzle-orm/pglite';
import { generateDrizzleJson, generateMigration } from 'drizzle-kit/api';
import * as schema from '@/server/db/schema';
jest.mock('@/server/db/drizzle', () => ({ get db() { return database; } }));
const { PGlite } = process.getBuiltinModule('module').createRequire(__filename)('@electric-sql/pglite') as typeof import('@electric-sql/pglite');
const client = new PGlite();
const database = drizzle(client, {schema});
let getContributedArtists: typeof import('../getContributedArtists').getContributedArtists;
const user = '00000000-0000-4000-8000-000000001325';
const other = '00000000-0000-4000-8000-000000001326';
const ids = Array.from({length: 5}, (_, i) => `00000000-0000-4000-8000-00000000000${i}`);
beforeAll(async () => {
 jest.resetModules();
 ({getContributedArtists} = await import('../getContributedArtists'));
 const statements = await generateMigration(generateDrizzleJson({}),generateDrizzleJson({artists:schema.artists,users:schema.users,ugcresearch:schema.ugcresearch,artistSelfEdits:schema.artistSelfEdits,userArtistBookmarks:schema.userArtistBookmarks}));
 await client.exec("CREATE FUNCTION uuid_generate_v4() RETURNS uuid LANGUAGE SQL AS 'SELECT gen_random_uuid()';");
 for(const statement of statements) if(statement.startsWith('CREATE TABLE') || statement.includes('ADD CONSTRAINT')) await client.exec(statement);
 await database.insert(schema.users).values([{id:user},{id:other}]);
 await database.insert(schema.artists).values(ids.map((id,i)=>({id,name:['Added','Approved','Edited','Pending','Bookmarked'][i],addedBy:i===0?user:other})));
 await database.insert(schema.ugcresearch).values([{userId:user,artistId:ids[0],accepted:true},{userId:user,artistId:ids[1],accepted:true},{userId:user,artistId:ids[1],accepted:true},{userId:user,artistId:ids[3],accepted:false}]);
 await database.insert(schema.artistSelfEdits).values([0,2,2].map(i=>({userId:user,artistId:ids[i]!,siteName:'website',newValue:'example.org',submittedUrl:'https://example.org'})));
 await database.insert(schema.userArtistBookmarks).values({userId:user,artistId:ids[4]!,position:0});
},30000);
afterAll(async()=>{await client.close()});
it('unions additions, approved contributions and self-edits once; ignores pending and bookmark-only artists',async()=>{
 const result=await getContributedArtists(user,{offset:0,limit:24});
 expect(result.total).toBe(3);expect(result.artists.map(a=>a.id)).toEqual(ids.slice(0,3));
});
it('isolates accounts, including an account without any contributions',async()=>{
 expect((await getContributedArtists(other,{offset:0,limit:24})).artists.map(a=>a.id)).toEqual([ids[1],ids[4],ids[2],ids[3]]);
 expect(await getContributedArtists('00000000-0000-4000-8000-000000009999',{offset:0,limit:24})).toEqual({artists:[],total:0});
});
it('paginates after deduplication and searches the whole eligible set',async()=>{
 expect((await getContributedArtists(user,{offset:1,limit:1})).artists.map(a=>a.id)).toEqual([ids[1]]);
 const result=await getContributedArtists(user,{offset:0,limit:1,query:'EDIT'});
 expect(result.total).toBe(1);expect(result.artists[0]?.id).toBe(ids[2]);
 expect((await getContributedArtists(user,{offset:0,limit:24,query:'%'})).total).toBe(0);
});
