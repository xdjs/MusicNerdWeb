import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const artist = '00000000-0000-4000-8000-000000001580';
const actor = '00000000-0000-4000-8000-000000001581';
const claim = '00000000-0000-4000-8000-000000001582';
const other = '00000000-0000-4000-8000-000000001583';
const mapping = '00000000-0000-4000-8000-000000001584';
const migration = new URL('../../drizzle/0056_catalog_disconnect.sql', import.meta.url);

async function fixture() {
  const migrationSql = await readFile(migration, 'utf8');
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE mnweb; CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE TABLE users(id uuid primary key, is_admin boolean default false, is_white_listed boolean default false);
    CREATE TABLE artists(id uuid primary key, name text, spotify text, deezer text, bio text, updated_at timestamptz default now());
    CREATE TABLE artist_claims(id uuid primary key, artist_id uuid, user_id uuid, status text);
    CREATE TABLE artist_id_mappings(id uuid primary key, artist_id uuid not null, platform text not null, platform_id text not null, confidence text not null, source text not null, reasoning text, api_key_hash text, resolved_at timestamptz not null, created_at timestamptz not null, updated_at timestamptz not null, unique(artist_id,platform), unique(platform,platform_id));
    CREATE TABLE artist_research_jobs(id uuid primary key, artist_id uuid, kind text, status text, state jsonb, claimed_at timestamptz, updated_at timestamptz);
    CREATE TABLE artist_mapping_exclusions(id uuid, artist_id uuid, platform text, details text);
    CREATE TABLE fixture_snapshots(artist_id uuid, provider text, account_id text, payload jsonb);
    CREATE TABLE fixture_audit(value text);
    INSERT INTO users VALUES ('${actor}', false, false), ('${other}', false, false);
    INSERT INTO artists VALUES ('${artist}','Fixture','spotify-before','101','preserve bio', '2026-10-01T00:00:00Z'), ('${other}','Other','other-spotify','999','other bio','2026-10-01T00:00:00Z');
    INSERT INTO artist_claims VALUES ('${claim}','${artist}','${actor}','approved');
    INSERT INTO artist_id_mappings VALUES ('${mapping}','${artist}','deezer','101','medium','name_search','original reasoning','synthetic-hash','2026-04-01T01:42:41Z','2026-04-01T01:42:41Z','2026-04-01T01:42:41Z');
    INSERT INTO artist_research_jobs VALUES ('${mapping}','${artist}','spotify_match','pending','{"keep":true}',null,now()), ('${other}','${other}','spotify_match','pending','{}',null,now()), ('${claim}','${artist}','source_search','pending','{}',null,now());
    INSERT INTO fixture_snapshots VALUES ('${artist}','deezer','101','{"old":true}');
    INSERT INTO fixture_audit VALUES ('original');
    GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO mnweb;
    ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
    ALTER TABLE artist_claims ENABLE ROW LEVEL SECURITY;
    ALTER TABLE artist_id_mappings ENABLE ROW LEVEL SECURITY;
    ALTER TABLE artist_research_jobs ENABLE ROW LEVEL SECURITY;
    CREATE POLICY fixture_app ON artists TO mnweb USING (true) WITH CHECK (true);
    CREATE POLICY fixture_app ON users TO mnweb USING (true) WITH CHECK (true);
    CREATE POLICY fixture_app ON artist_claims TO mnweb USING (true) WITH CHECK (true);
    CREATE POLICY fixture_select ON artist_id_mappings FOR SELECT TO mnweb USING (true);
    CREATE POLICY fixture_insert ON artist_id_mappings FOR INSERT TO mnweb WITH CHECK (true);
    CREATE POLICY fixture_update ON artist_id_mappings FOR UPDATE TO mnweb USING (true) WITH CHECK (true);
    CREATE POLICY fixture_app ON artist_research_jobs TO mnweb USING (true) WITH CHECK (true);
  `);
  await db.exec(migrationSql);
  return db;
}
async function snapshot(db) {
  return (await db.query('SELECT to_jsonb(m) AS value FROM public.artist_id_mappings m WHERE artist_id=$1 AND platform=$2', [artist,'deezer'])).rows[0]?.value ?? null;
}
async function state(db) {
  const result = {};
  for (const table of ['artists','artist_id_mappings','artist_research_jobs','artist_mapping_exclusions','fixture_snapshots','fixture_audit','musicnerd_private.catalog_link_disconnects']) {
    result[table] = (await db.query(`SELECT to_jsonb(t) AS value FROM ${table} t ORDER BY to_jsonb(t)::text`)).rows;
  }
  return result;
}
async function disconnect(db, overrides = {}) {
  const args = { artist, platform:'deezer', value:'101', mapping: await snapshot(db), actor, claim, authorization:'owner', ...overrides };
  await db.exec('BEGIN; SET LOCAL ROLE mnweb');
  try {
    const result = await db.query('SELECT musicnerd_private.disconnect_catalog_link($1::uuid,$2,$3,$4::jsonb,$5::uuid,$6::uuid,$7) AS old_value', [args.artist,args.platform,args.value,args.mapping === null ? null : JSON.stringify(args.mapping),args.actor,args.claim,args.authorization]);
    await db.exec('COMMIT');
    return result.rows[0].old_value;
  } catch (e) { await db.exec('ROLLBACK'); throw e; }
}

test('archive exact mapping, clear and cancel only own matching job; old snapshots become ineligible', async () => {
  const db = await fixture();
  try {
    const before = await state(db), original = await snapshot(db);
    assert.equal(await disconnect(db), '101');
    const after = await state(db);
    const event = after['musicnerd_private.catalog_link_disconnects'][0].value;
    assert.deepEqual(event.mapping_snapshot, original);
    assert.equal(event.actor_user_id, actor); assert.equal(event.claim_id, claim);
    assert.equal(event.old_value, '101'); assert.equal(event.authorization_mode, 'owner');
    assert.equal(after.artist_id_mappings.length, 0);
    const row = after.artists.find(x => x.value.id===artist).value;
    assert.equal(row.deezer, null); assert.equal(row.spotify, 'spotify-before'); assert.equal(row.bio, 'preserve bio');
    for (const table of ['artist_mapping_exclusions','fixture_snapshots','fixture_audit']) assert.deepEqual(after[table],before[table]);
    assert.deepEqual(after.artists.find(x=>x.value.id===other), before.artists.find(x=>x.value.id===other));
    assert.deepEqual(after.artist_research_jobs.filter(x=>x.value.id!==mapping), before.artist_research_jobs.filter(x=>x.value.id!==mapping));
    const job=after.artist_research_jobs.find(x=>x.value.id===mapping).value;
    assert.equal(job.status,'done'); assert.deepEqual(job.state,{keep:true,identityChanged:true,outcome:'identity_changed'});
    assert.equal((await db.query('SELECT s.* FROM fixture_snapshots s JOIN artists a ON a.id=s.artist_id AND a.deezer=s.account_id')).rows.length,0);
    // A new explicit identity can occupy the freed active mapping slot; production writer collision checks are tested separately.
    await db.query("INSERT INTO artist_id_mappings VALUES ($1,$2,'deezer','202','manual','manual','replacement',null,now(),now(),now())", [other,artist]);
    assert.equal((await snapshot(db)).platform_id,'202');
    assert.equal((await db.query('SELECT count(*)::int AS n FROM musicnerd_private.catalog_link_disconnects')).rows[0].n,1);
  } finally { await db.close(); }
});

for (const scenario of ['stale displayed ID','stale full mapping','wrong actor','changed claim','missing actor','wrong platform','unknown mode','divergent mapping','null field retained mapping']) {
  test(`reject ${scenario} without any mutation`, async () => {
    const db=await fixture();
    try {
      const overrides={};
      if(scenario==='stale displayed ID') overrides.value='old-view';
      if(scenario==='stale full mapping') { overrides.mapping=await snapshot(db); overrides.mapping.reasoning='stale'; }
      if(scenario==='wrong actor') overrides.actor=other;
      if(scenario==='changed claim') overrides.claim=other;
      if(scenario==='missing actor') overrides.actor=null;
      if(scenario==='wrong platform') overrides.platform='instagram';
      if(scenario==='unknown mode') overrides.authorization='manual';
      if(scenario==='divergent mapping') await db.exec("UPDATE artist_id_mappings SET platform_id='divergent'");
      if(scenario==='null field retained mapping') { await db.exec('UPDATE artists SET deezer=null'); overrides.value=null; }
      const before=await state(db);
      await assert.rejects(disconnect(db,overrides));
      assert.deepEqual(await state(db),before);
    } finally { await db.close(); }
  });
}

test('no mapping still archives the direct clear; retry refuses without duplicate event', async()=>{
 const db=await fixture(); try {
  await db.exec('DELETE FROM artist_id_mappings');
  await disconnect(db);
  assert.equal((await db.query('SELECT mapping_snapshot FROM musicnerd_private.catalog_link_disconnects')).rows[0].mapping_snapshot,null);
  const before=await state(db); await assert.rejects(disconnect(db)); assert.deepEqual(await state(db),before);
  assert.equal(await disconnect(db,{value:null}),null); assert.deepEqual(await state(db),before);
 } finally {await db.close();}
});

test('contributor mode checks current whitelist/admin without claiming artist ownership', async()=>{
 const db=await fixture();try {
  await assert.rejects(disconnect(db,{actor:other,authorization:'contributor'}));
  await db.query('UPDATE users SET is_white_listed=true WHERE id=$1',[other]);
  await disconnect(db,{actor:other,authorization:'contributor'});
  assert.equal((await db.query('SELECT authorization_mode FROM musicnerd_private.catalog_link_disconnects')).rows[0].authorization_mode,'contributor');
 }finally{await db.close();}
});

for(const failure of ['archive','after-delete']) test(`forced ${failure} failure rolls back clear/archive/delete/jobs`,async()=>{
 const db=await fixture();try{
  if(failure==='archive') await db.exec("ALTER TABLE musicnerd_private.catalog_link_disconnects ADD CONSTRAINT fixture_reject CHECK (false)");
  else await db.exec("CREATE FUNCTION fixture_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'forced cancellation failure'; END $$; CREATE TRIGGER fixture_fail BEFORE UPDATE ON artist_research_jobs FOR EACH ROW EXECUTE FUNCTION fixture_fail()");
  const before=await state(db); await assert.rejects(disconnect(db));assert.deepEqual(await state(db),before);
 }finally{await db.close();}
});

test('mnweb can only execute; browser roles cannot use function/archive or delete active mappings',async()=>{
 const db=await fixture();try{
  for(const role of ['mnweb','anon','authenticated']) {
   await db.exec(`SET ROLE ${role}`);
   await assert.rejects(db.query('SELECT * FROM musicnerd_private.catalog_link_disconnects'));
   await assert.rejects(db.query('DELETE FROM public.artist_id_mappings'));
   if(role!=='mnweb') await assert.rejects(db.query('SELECT musicnerd_private.disconnect_catalog_link($1::uuid,$2,$3,null,$4::uuid,$5::uuid,$6)',[artist,'deezer','101',actor,claim,'owner']));
   await db.exec('RESET ROLE');
  }
  for (const role of ['anon','authenticated','mnweb']) {
    const allowed=(await db.query("SELECT has_function_privilege($1, 'musicnerd_private.disconnect_catalog_link(uuid,text,text,jsonb,uuid,uuid,text)'::regprocedure, 'EXECUTE') AS allowed", [role])).rows[0].allowed;
    assert.equal(allowed, role==='mnweb');
  }
  const f=(await db.query("SELECT prosecdef, proconfig, pg_get_userbyid(proowner) AS owner FROM pg_proc WHERE oid='musicnerd_private.disconnect_catalog_link(uuid,text,text,jsonb,uuid,uuid,text)'::regprocedure")).rows[0];
  assert.equal(f.prosecdef,true);assert.ok(f.proconfig.includes('search_path=pg_catalog, pg_temp'));assert.notEqual(f.owner,'mnweb');
 }finally{await db.close();}
});

 test('explicit empty disconnect still cancels pending identity jobs without inventing history',async()=>{
 const db=await fixture();try{
  await db.exec("DELETE FROM artist_id_mappings; UPDATE artists SET deezer=null WHERE id='"+artist+"'");
  assert.equal(await disconnect(db,{value:null}),null);
  assert.equal((await db.query("SELECT status FROM artist_research_jobs WHERE id=$1",[mapping])).rows[0].status,'done');
  assert.equal((await db.query('SELECT count(*)::int AS n FROM musicnerd_private.catalog_link_disconnects')).rows[0].n,0);
 }finally{await db.close();}
});

 test('pre-existing private schema fails atomically without altering unrelated access',async()=>{
 const db=new PGlite();try{
  await db.exec('CREATE ROLE mnweb; CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA musicnerd_private; GRANT USAGE ON SCHEMA musicnerd_private TO authenticated; CREATE TABLE musicnerd_private.sentinel(id integer)');
  await assert.rejects(db.exec(await readFile(migration,'utf8')));
  await db.exec('ROLLBACK');
  assert.equal((await db.query("SELECT has_schema_privilege('authenticated','musicnerd_private','USAGE') AS allowed")).rows[0].allowed,true);
  assert.equal((await db.query("SELECT to_regclass('musicnerd_private.catalog_link_disconnects') AS table_name")).rows[0].table_name,null);
  assert.equal((await db.query("SELECT to_regclass('musicnerd_private.sentinel') AS table_name")).rows[0].table_name,'musicnerd_private.sentinel');
 }finally{await db.close();}
});

test('Spotify disconnect preserves Deezer and archives its own mapping', async () => {
  const db=await fixture(); try {
    await db.exec("UPDATE artist_id_mappings SET platform='spotify',platform_id='spotify-before'");
    const original=(await db.query('SELECT to_jsonb(m) AS value FROM artist_id_mappings m')).rows[0].value;
    assert.equal(await disconnect(db,{platform:'spotify',value:'spotify-before',mapping:original}),'spotify-before');
    const row=(await db.query('SELECT spotify,deezer FROM artists WHERE id=$1',[artist])).rows[0];
    assert.deepEqual(row,{spotify:null,deezer:'101'});
    const event=(await db.query('SELECT mapping_snapshot FROM musicnerd_private.catalog_link_disconnects')).rows[0];
    assert.deepEqual(event.mapping_snapshot,original);
  } finally { await db.close(); }
});

// Local rehearsal of the separately authorized operator recovery procedure.
// This is not an application capability, automatic undo, or production script.
async function restore(db,eventId) {
  await db.exec('BEGIN');
  try {
    const event=(await db.query('SELECT * FROM musicnerd_private.catalog_link_disconnects WHERE id=$1',[eventId])).rows[0];
    assert.ok(event); assert.ok(['spotify','deezer'].includes(event.platform));
    await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`musicnerd:artist-platform-slot:${event.artist_id}:${event.platform}`]);
    await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`musicnerd:artist-platform:${event.platform}:${event.old_value}`]);
    const row=(await db.query(`SELECT ${event.platform} AS value FROM artists WHERE id=$1 FOR UPDATE`,[event.artist_id])).rows[0];
    assert.equal(row?.value,null,'a newer direct identity exists');
    assert.equal((await db.query('SELECT id FROM artist_id_mappings WHERE artist_id=$1 AND platform=$2',[event.artist_id,event.platform])).rows.length,0,'a newer own mapping exists');
    assert.equal((await db.query(`SELECT id FROM artists WHERE id<>$1 AND ${event.platform}=$2`,[event.artist_id,event.old_value])).rows.length,0,'another artist owns the direct identity');
    assert.equal((await db.query('SELECT id FROM artist_id_mappings WHERE platform=$1 AND platform_id=$2',[event.platform,event.old_value])).rows.length,0,'another artist owns the mapped identity');
    if(event.mapping_snapshot) await db.query('INSERT INTO artist_id_mappings SELECT (jsonb_populate_record(NULL::artist_id_mappings,$1::jsonb)).*',[JSON.stringify(event.mapping_snapshot)]);
    await db.query(`UPDATE artists SET ${event.platform}=$1 WHERE id=$2 AND ${event.platform} IS NULL`,[event.old_value,event.artist_id]);
    await db.exec('COMMIT');
  } catch(error) { await db.exec('ROLLBACK'); throw error; }
}
for(const scenario of ['full mapping','no mapping','new direct identity','new own mapping','other direct collision','other mapping collision']) {
 test(`operator recovery rehearsal: ${scenario}`,async()=>{
  const db=await fixture(); try {
    if(scenario==='no mapping') await db.exec('DELETE FROM artist_id_mappings');
    const original=await snapshot(db);
    await disconnect(db);
    const event=(await db.query('SELECT id FROM musicnerd_private.catalog_link_disconnects')).rows[0];
    if(scenario==='new direct identity') await db.query("UPDATE artists SET deezer='202' WHERE id=$1",[artist]);
    if(scenario==='other direct collision') await db.query("UPDATE artists SET deezer='101' WHERE id=$1",[other]);
    if(scenario==='new own mapping' || scenario==='other mapping collision') await db.query("INSERT INTO artist_id_mappings VALUES ($1,$2,'deezer',$3,'manual','fixture',null,null,now(),now(),now())",[other,scenario==='new own mapping'?artist:other,scenario==='new own mapping'?'202':'101']);
    const before=await state(db);
    if(scenario==='full mapping'||scenario==='no mapping') {
      await restore(db,event.id);
      assert.equal((await db.query('SELECT deezer FROM artists WHERE id=$1',[artist])).rows[0].deezer,'101');
      assert.deepEqual(await snapshot(db),original);
      const after=await state(db);
      for(const table of ['musicnerd_private.catalog_link_disconnects','artist_research_jobs','artist_mapping_exclusions','fixture_snapshots','fixture_audit']) assert.deepEqual(after[table],before[table]);
    } else {
      await assert.rejects(restore(db,event.id)); assert.deepEqual(await state(db),before);
    }
  } finally {await db.close();}
 });
}
