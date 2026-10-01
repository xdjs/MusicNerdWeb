/** Disposable PostgreSQL verification; never reads .env.local or a hosted database.
 * Start initdb under /tmp/musicnerd-account-merge-db.*/
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import postgres from 'postgres';
import type { ArtistVaultSource } from '../src/server/db/DbTypes';

async function main() {
  const url = new URL(process.env.ACCOUNT_MERGE_TEST_ADMIN_URL ?? '');
  assert.equal(url.hostname, '127.0.0.1');
  assert.equal(url.pathname, '/postgres');
  assert.equal(process.env.NODE_ENV, 'test');
  const admin = postgres(url.toString(), { max: 1 });
  let owner: ReturnType<typeof postgres> | undefined;
  let app: ReturnType<typeof postgres> | undefined;
  let contender: ReturnType<typeof postgres> | undefined;
  let created = false;
  try {
    const [cluster] = await admin`select current_setting('data_directory') as path`;
    assert.match(cluster.path, /^\/(?:private\/)?tmp\/musicnerd-account-merge-db\.[^/]+\/data$/);
    await admin.unsafe('CREATE DATABASE musicnerd_account_merge_verification');
    created = true;
    url.pathname = '/musicnerd_account_merge_verification';
    owner = postgres(url.toString(), { max: 1 });
    await owner.unsafe(`
      CREATE ROLE mnweb LOGIN; CREATE ROLE anon; CREATE ROLE authenticated;
      CREATE EXTENSION "uuid-ossp";
      CREATE TABLE users (id uuid PRIMARY KEY, username text, email text, wallet text,
        privy_user_id text UNIQUE, legacy_id text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(),
        is_admin boolean DEFAULT false, is_white_listed boolean DEFAULT false, is_super_admin boolean DEFAULT false,
        is_hidden boolean DEFAULT false, legacy_link_dismissed boolean DEFAULT false, accepted_ugc_count bigint DEFAULT 0);
      ALTER TABLE users ENABLE ROW LEVEL SECURITY;
      CREATE POLICY app_users ON users TO mnweb USING (true) WITH CHECK (true);
      CREATE TABLE artists (id uuid PRIMARY KEY, name text, added_by uuid);
      CREATE TABLE ugcresearch (user_id uuid);
      CREATE TABLE artist_self_edits (user_id uuid);
      ALTER TABLE artist_self_edits ENABLE ROW LEVEL SECURITY;
      CREATE POLICY app_self_edits ON artist_self_edits FOR SELECT TO mnweb USING (true);
      GRANT SELECT ON artist_self_edits TO mnweb;
      CREATE TABLE artist_research_jobs (kind text);
      CREATE TABLE artist_vault_sources (id uuid PRIMARY KEY, artist_id uuid, created_at timestamptz DEFAULT now());
      GRANT SELECT, INSERT, UPDATE, DELETE ON users, artists, ugcresearch, artist_vault_sources TO mnweb;
      ALTER DEFAULT PRIVILEGES GRANT ALL ON TABLES TO anon, authenticated;
    `);
    for (const migration of ['0028_famous_captain_britain','0031_lore_attribution','0033_user_names','0035_account_merge_attribution']) {
      const sql = await readFile(new URL(`../drizzle/${migration}.sql`, import.meta.url), 'utf8');
      await owner.begin(tx => tx.unsafe(sql));
    }
    const [acl] = await owner`SELECT c.relrowsecurity AS rls,
      has_table_privilege('mnweb',c.oid,'SELECT') AS app_read,
      has_table_privilege('mnweb',c.oid,'INSERT,UPDATE,DELETE') AS app_write,
      has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE') AS anon_access,
      has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE') AS auth_access
      FROM pg_class c WHERE c.oid='public.account_merge_events'::regclass`;
    assert.deepEqual(acl, {rls:true,app_read:true,app_write:false,anon_access:false,auth_access:false});
    const policies = await owner`SELECT cmd,roles,qual,with_check FROM pg_policies WHERE tablename='account_merge_events'`;
    assert.deepEqual([...policies], [{cmd:'SELECT',roles:['mnweb'],qual:'true',with_check:null}]);
    const [fn] = await owner`SELECT prosecdef,proconfig,
      has_function_privilege('mnweb',oid,'EXECUTE') AS app_execute,
      has_function_privilege('anon',oid,'EXECUTE') AS anon_execute,
      has_function_privilege('authenticated',oid,'EXECUTE') AS auth_execute
      FROM pg_proc WHERE oid='public.transfer_account_activity(uuid,uuid,text)'::regprocedure`;
    assert.deepEqual(fn, {prosecdef:true,proconfig:['search_path=pg_catalog, pg_temp'],app_execute:true,anon_execute:false,auth_execute:false});

    url.username = 'mnweb'; url.password = '';
    process.env.SUPABASE_DB_CONNECTION = url.toString();
    const { db } = await import('../src/server/db/drizzle');
    app = db.$client;
    contender = postgres(url.toString(), {max:1});
    const { mergeAccounts } = await import('../src/server/utils/queries/userQueries');
    const { addSourceContributors } = await import('../src/server/utils/source/addSourceContributors');
    const { getArtistActivity } = await import('../src/server/utils/activity/getArtistActivity');
    const current='00000000-0000-4000-8000-000000000001', legacy='00000000-0000-4000-8000-000000000002';
    const artist='00000000-0000-4000-8000-000000000003', event='00000000-0000-4000-8000-000000000004';
    const source='00000000-0000-4000-8000-000000000005';
    await app`INSERT INTO users(id,username,privy_user_id,username_needs_confirmation) VALUES
      (${current},'Fixture Contributor','test-privy',false),(${legacy},'Legacy Listener',null,false)`;
    await app`INSERT INTO artists(id,name) VALUES (${artist},'Fixture Artist')`;
    await app`INSERT INTO artist_activity_events(id,artist_id,actor_user_id,actor_kind,action,trigger,source_id)
      VALUES (${event},${artist},${current},'user','source_added','editor',${source})`;
    await app`INSERT INTO artist_vault_sources(id,artist_id,activity_id,origin) VALUES (${source},${artist},${event},'submission')`;
    const [before] = await app`SELECT * FROM artist_activity_events WHERE id=${event}`;
    const [sourceBefore] = await app`SELECT * FROM artist_vault_sources WHERE id=${source}`;

    // A real delete failure occurs AFTER transfer/audit, proving transaction rollback.
    await owner.unsafe(`CREATE FUNCTION refuse_fixture_delete() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'Intentional rollback fixture'; END $$;
      CREATE TRIGGER refuse_fixture_delete BEFORE DELETE ON users FOR EACH ROW EXECUTE FUNCTION refuse_fixture_delete()`);
    assert.deepEqual(await mergeAccounts(current,legacy), {success:false,error:'Merge failed'});
    assert.deepEqual((await app`SELECT * FROM artist_activity_events WHERE id=${event}`)[0], before);
    assert.equal((await app`SELECT * FROM account_merge_events`).length,0);
    await owner.unsafe('DROP TRIGGER refuse_fixture_delete ON users; DROP FUNCTION refuse_fixture_delete()');
    assert.deepEqual(await mergeAccounts(current,legacy), {success:true});
    const [saved] = await app`SELECT id,artist_id AS "artistId",activity_id AS "activityId",origin FROM artist_vault_sources WHERE id=${source}`;
    assert.equal((await addSourceContributors(artist,[saved as ArtistVaultSource]))[0].contributorName,'Fixture Contributor');
    assert.equal((await getArtistActivity({eventId:event})).items[0].actorId,legacy);
    assert.deepEqual((await app`SELECT * FROM artist_activity_events WHERE id=${event}`)[0], {...before,actor_user_id:legacy});
    assert.deepEqual((await app`SELECT * FROM artist_vault_sources WHERE id=${source}`)[0],sourceBefore);
    for (const statement of ['UPDATE artist_activity_events SET actor_user_id=NULL','DELETE FROM artist_activity_events',
      'UPDATE account_merge_events SET activity_count=0','DELETE FROM account_merge_events']) {
      await assert.rejects(app.unsafe(statement),(e: unknown)=>(e as {code?:string}).code==='42501');
    }

    // Force the merge-wins serialization: insert's FK key-share lock must block,
    // then reject, never turn a stale account into an anonymous activity event.
    const late='00000000-0000-4000-8000-000000000006', next='00000000-0000-4000-8000-000000000007';
    await app`INSERT INTO users(id,username) VALUES (${next},'Older Listener')`;
    const [{pid:contenderPid}] = await contender`SELECT pg_backend_pid() AS pid`;
    let pendingInsert: Promise<string> | undefined;
    await app.begin(async tx => {
      await tx`SELECT id FROM users WHERE id IN (${legacy},${next}) ORDER BY id FOR UPDATE`;
      const insertion = contender!`INSERT INTO artist_activity_events(id,artist_id,actor_user_id,actor_kind,action,trigger)
        VALUES (${late},${artist},${legacy},'user','source_added','editor')`.then(()=> 'inserted', e=>e.code);
      // Observe the FK lock wait before releasing it; fail rather than hang on a regression.
      const deadline = Date.now()+5000;
      while (true) {
        const [wait] = await owner!`SELECT wait_event_type FROM pg_stat_activity WHERE pid=${contenderPid}`;
        if (wait?.wait_event_type === 'Lock') break;
        assert.ok(Date.now()<deadline,'Concurrent insert did not wait on the user row lock');
        await new Promise(resolve=>setTimeout(resolve,10));
      }
      // Complete the same transfer/delete sequence under the real row locks.
      await tx`UPDATE users SET privy_user_id=NULL WHERE id=${legacy}`;
      await tx`UPDATE users SET privy_user_id='test-privy' WHERE id=${next}`;
      await tx`SELECT public.transfer_account_activity(${legacy},${next},'test-privy')`;
      await tx`DELETE FROM users WHERE id=${legacy}`;
      // Await the insertion only after this transaction commits below.
      pendingInsert = insertion;
    });
    assert.equal(await pendingInsert,'23503');
    assert.equal((await app`SELECT * FROM artist_activity_events WHERE id=${late}`).length,0);
    assert.equal((await getArtistActivity({eventId:event})).items[0].actorId,next);
    assert.equal((await app`SELECT * FROM account_merge_events`).length,2);
    console.log('PASS: real mnweb merge/readers, exact grants/RLS, immutable history, rollback after transfer, repeated merge and concurrent stale insert rejection.');
  } finally {
    await contender?.end(); await app?.end(); await owner?.end();
    if (created) await admin.unsafe('DROP DATABASE musicnerd_account_merge_verification');
    await admin.end();
  }
}
main().catch(error => { console.error(error); process.exitCode=1; });
