/** @jest-environment node */
const { PGlite } = process.getBuiltinModule('module').createRequire(__filename)('@electric-sql/pglite') as typeof import('@electric-sql/pglite');
import { drizzle } from "drizzle-orm/pglite";
import { createHash } from "node:crypto";
import { vaultSourceRevision } from "@/server/utils/artistDoc/vaultSourceRevision";
jest.mock("@/server/db/drizzle", () => ({ db: {} }));
import { getPublicSavedBio } from "../getPublicSavedBio";
it("rechecks immutable trust, claim scope, privacy and moderation without rewriting history", async () => {
 const pg=new PGlite(), db=drizzle(pg); const artist="00000000-0000-4000-8000-000000000001", sourceId="00000000-0000-4000-8000-000000000002", event="00000000-0000-4000-8000-000000000003", claim="00000000-0000-4000-8000-000000000004";
 const source={id:sourceId,url:"https://example.org/source",activityId:event,origin:"submission",publication:"inherit",extractedText:"Saved evidence"};
 const bio="Generated biography.";
 const provenance={version:1,kind:"generated",bioHash:createHash("sha256").update(bio).digest("hex"),claimId:null,sources:[{id:1,kind:"vault",url:source.url,revision:vaultSourceRevision(source)}]};
 try {
  await pg.exec(`create table artists(id uuid,bio text);create schema mn_private;create table mn_private.artist_bio_provenance(artist_id uuid,provenance jsonb);create table artist_claims(id uuid,artist_id uuid,status text);create table artist_activity_events(id uuid,artist_id uuid,source_id uuid,actor_kind text,actor_user_id uuid,trigger text,action text);create table artist_vault_sources(id uuid,artist_id uuid,activity_id uuid,origin text,publication text,status text,url text,extracted_text text,title text,snippet text,published_at text,file_path text);`);
  await pg.query("insert into artists values($1,$2)",[artist,bio]);
  await pg.query("insert into mn_private.artist_bio_provenance values($1,$2)",[artist,JSON.stringify(provenance)]);
  await pg.query("insert into artist_vault_sources(id,artist_id,activity_id,origin,publication,status,url,extracted_text) values($1,$2,$3,'submission','inherit','approved',$4,$5)",[sourceId,artist,event,source.url,source.extractedText]);
  const read=()=>getPublicSavedBio(artist,{ execute: async (query: Parameters<typeof db.execute>[0]) => (await db.execute(query)).rows } as never);
  expect(await read()).toBeNull();
  await pg.query("insert into artist_activity_events values($1,$2,$3,'user',$2,'trusted_submission','source_submission')",[event,artist,sourceId]);
  expect(await read()).toBe(bio);
  await pg.query("insert into artist_claims values($1,$2,'approved')",[claim,artist]); expect(await read()).toBe(bio);
  for(const change of ["publication='private'","status='rejected'","status='pending'","extracted_text='changed'"]){
   await pg.exec(`update artist_vault_sources set ${change}`);expect(await read()).toBeNull();
   await pg.query("update artist_vault_sources set publication='inherit',status='approved',extracted_text=$1",[source.extractedText]);
  }
  // Claim approval alone cannot certify legacy or evidence-free generated prose.
  await pg.exec("delete from mn_private.artist_bio_provenance");expect(await read()).toBeNull();
  expect((await pg.query("select bio from artists")).rows).toEqual([{bio}]);
  const emptyGenerated={...provenance,claimId:claim,sources:[]};
  await pg.query("insert into mn_private.artist_bio_provenance values($1,$2)",[artist,JSON.stringify(emptyGenerated)]);expect(await read()).toBeNull();
  await pg.query("update mn_private.artist_bio_provenance set provenance=$1",[JSON.stringify({...emptyGenerated,kind:"authored"})]);expect(await read()).toBe(bio);
  await pg.query("update mn_private.artist_bio_provenance set provenance=$1",[JSON.stringify(provenance)]);
  await pg.exec("delete from artist_claims;update artist_activity_events set source_id=null");expect(await read()).toBeNull();
  expect((await pg.query("select a.bio,p.provenance from artists a join mn_private.artist_bio_provenance p on p.artist_id=a.id")).rows).toEqual([{bio,provenance}]);
 }finally{await pg.close();}
},30000);
