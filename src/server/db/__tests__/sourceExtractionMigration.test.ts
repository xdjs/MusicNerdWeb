/** @jest-environment node */
import { readFileSync } from "node:fs";
const { PGlite } = process.getBuiltinModule("module").createRequire(__filename)("@electric-sql/pglite") as typeof import("@electric-sql/pglite");
it("adds source extraction without losing the old kinds or the live-job uniqueness rule",async()=>{
 const db=new PGlite();
 try {
  await db.exec(`create table artist_research_jobs (artist_id text,kind text constraint artist_research_jobs_kind_check check(kind in ('social_ingest','caption_extract','lore_refresh','source_search','latest_refresh')),status text);create unique index live_jobs on artist_research_jobs(artist_id,kind) where status in ('pending','running');`);
  await expect(db.exec("insert into artist_research_jobs values('artist','source_extract','pending')")).rejects.toThrow();
  await db.exec(readFileSync("drizzle/0036_source_extract.sql","utf8"));
  await db.exec("insert into artist_research_jobs values('artist','source_extract','pending')");
  await expect(db.exec("insert into artist_research_jobs values('artist','source_extract','running')")).rejects.toThrow();
  for(const kind of ['social_ingest','caption_extract','lore_refresh','source_search','latest_refresh']) await db.query("insert into artist_research_jobs values('artist',$1,'pending')",[kind]);
  await expect(db.exec("insert into artist_research_jobs values('artist','invalid','pending')")).rejects.toThrow();
  expect((await db.query("select count(*)::int as n from artist_research_jobs")).rows).toEqual([{n:6}]);
 }finally{await db.close();}
},30000);
