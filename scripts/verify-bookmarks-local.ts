/** Disposable Postgres integration check. No .env.local or hosted database use.
 * Start a fresh `initdb` cluster under /tmp/musicnerd-bookmark-db.* and run:
 * BOOKMARK_TEST_ADMIN_URL=postgres://<local-user>@127.0.0.1:<port>/postgres NODE_ENV=test npx tsx scripts/verify-bookmarks-local.ts
 * The guard rejects other hosts/clusters. It creates one test DB, then removes it.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import postgres from 'postgres';

async function main() {
    const url = new URL(process.env.BOOKMARK_TEST_ADMIN_URL ?? '');
    assert.equal(url.hostname, '127.0.0.1', 'Only an isolated loopback database is allowed');
    assert.equal(url.pathname, '/postgres');
    assert.equal(process.env.NODE_ENV, 'test');
    const admin = postgres(url.toString(), { max: 1, prepare: false });
    let database: ReturnType<typeof postgres> | undefined;
    let app: ReturnType<typeof postgres> | undefined;
    let created = false;
    try {
        const [cluster] = await admin`select current_setting('data_directory') as path`;
        assert.match(cluster.path, /^\/(?:private\/)?tmp\/musicnerd-bookmark-db\.[^/]+\/data$/);
        await admin.unsafe('CREATE DATABASE musicnerd_bookmark_verification');
        created = true;
        url.pathname = '/musicnerd_bookmark_verification';
        database = postgres(url.toString(), { max: 1, prepare: false });
        await database.unsafe(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mnweb') THEN CREATE ROLE mnweb LOGIN; END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon; END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated; END IF;
            END $$;
            CREATE TABLE users (id uuid PRIMARY KEY, email text, username text, wallet text,
                privy_user_id text UNIQUE, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(),
                legacy_id text, is_admin boolean DEFAULT false, is_white_listed boolean DEFAULT false,
                is_super_admin boolean DEFAULT false, is_hidden boolean DEFAULT false,
                legacy_link_dismissed boolean DEFAULT false, accepted_ugc_count bigint DEFAULT 0);
            CREATE TABLE artists (id uuid PRIMARY KEY, name text, custom_image text, deezer text, added_by uuid);
            CREATE TABLE ugcresearch (user_id uuid);
            CREATE TABLE artist_self_edits (id uuid PRIMARY KEY, user_id uuid REFERENCES users(id) ON DELETE CASCADE);
            ALTER TABLE artist_self_edits ENABLE ROW LEVEL SECURITY;
            CREATE POLICY mnweb_select_artist_self_edits ON artist_self_edits FOR SELECT TO mnweb USING (true);
            GRANT SELECT ON artist_self_edits TO mnweb;
            GRANT SELECT, INSERT, UPDATE, DELETE ON users, artists, ugcresearch TO mnweb;
            ALTER DEFAULT PRIVILEGES GRANT ALL ON TABLES TO anon, authenticated;
        `);
        await database.unsafe(await readFile(new URL('../drizzle/0028_famous_captain_britain.sql', import.meta.url), 'utf8'));
        const [security] = await database`
            SELECT c.relrowsecurity AS rls,
                has_table_privilege('mnweb', c.oid, 'SELECT,INSERT,UPDATE,DELETE') AS app_access,
                has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE') AS anon_access,
                has_table_privilege('authenticated', c.oid, 'SELECT,INSERT,UPDATE,DELETE') AS auth_access
            FROM pg_class c WHERE c.oid = 'public.user_artist_bookmarks'::regclass`;
        assert.deepEqual(security, { rls: true, app_access: true, anon_access: false, auth_access: false });
        const policies = await database`SELECT cmd, roles, qual, with_check FROM pg_policies WHERE tablename = 'user_artist_bookmarks' ORDER BY cmd`;
        assert.equal(policies.length, 4);
        for (const policy of policies) {
            assert.deepEqual(policy.roles, ['mnweb']);
            if (policy.cmd !== 'INSERT') assert.equal(policy.qual, 'true');
            if (policy.cmd === 'INSERT' || policy.cmd === 'UPDATE') assert.equal(policy.with_check, 'true');
        }
        const user = '11111111-1111-4111-8111-111111111111';
        const legacy = '22222222-2222-4222-8222-222222222222';
        const a = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
        const b = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
        const c = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
        await database`INSERT INTO users (id, privy_user_id) VALUES (${user}, 'did:privy:test'), (${legacy}, null)`;
        await database`INSERT INTO artists (id, name, deezer) VALUES (${a}, 'A', '27'), (${b}, 'B', null), (${c}, 'C', null)`;
        url.username = 'mnweb';
        url.password = '';
        process.env.SUPABASE_DB_CONNECTION = url.toString();
        const { db } = await import('../src/server/db/drizzle');
        app = db.$client;
        const { addUserBookmarks, editUserBookmarks, getUserBookmarks, removeUserBookmark } = await import('../src/server/utils/queries/bookmarkQueries');
        const { mergeAccounts } = await import('../src/server/utils/queries/userQueries');
        const ids = async (id: string) => (await getUserBookmarks(id)).map(({ artistId }) => artistId);
        await addUserBookmarks(user, [a, b, a]);
        await addUserBookmarks(user, [a]);
        assert.deepEqual(await ids(user), [a, b]);
        await Promise.all([addUserBookmarks(user, [c]), editUserBookmarks(user, [b, a], [])]);
        assert.deepEqual(await ids(user), [c, b, a]);
        await removeUserBookmark(user, b);
        await editUserBookmarks(user, [b, a], []);
        assert.deepEqual(await ids(user), [c, a], 'stale reorder must not resurrect deleted bookmark');
        await removeUserBookmark(user, b);
        await addUserBookmarks(legacy, [b, a]);
        const [added, merged] = await Promise.allSettled([addUserBookmarks(user, [b]), mergeAccounts(user, legacy)]);
        assert.equal(merged.status, 'fulfilled');
        if (merged.status === 'fulfilled') assert.equal(merged.value.success, true);
        // Both serializations are valid: the add finishes before transfer, or
        // merge wins the lock and the stale deleted account cannot be written.
        if (added.status === 'rejected') assert.match(added.reason.message, /Bookmark account no longer exists/);
        assert.deepEqual(await ids(legacy), [b, a, c]);
        assert.equal((await database`SELECT id FROM users WHERE id = ${user}`).length, 0);
        const positions = await database`SELECT position FROM user_artist_bookmarks WHERE user_id = ${legacy} ORDER BY position`;
        assert.deepEqual(positions.map(({ position }) => position), [0, 1, 2]);
        await removeUserBookmark(legacy, a);
        await addUserBookmarks(legacy, [a], true);
        assert.deepEqual(await ids(legacy), [b, c], 'stale browser import must not restore removals');
        await addUserBookmarks(legacy, [a]);
        assert.deepEqual(await ids(legacy), [a, b, c], 'explicit bookmark restores a removed artist');
        await database`DELETE FROM artists WHERE id = ${c}`;
        assert.deepEqual(await ids(legacy), [a, b], 'artist deletion must cascade');
        for (const role of ['anon', 'authenticated']) {
            for (const statement of [
                'SELECT * FROM user_artist_bookmarks',
                `INSERT INTO user_artist_bookmarks (user_id, artist_id, position) VALUES ('${legacy}','${b}',0)`,
                'UPDATE user_artist_bookmarks SET position = 0', 'DELETE FROM user_artist_bookmarks',
            ]) {
                await assert.rejects(database.begin(async (tx) => {
                    await tx.unsafe(`SET LOCAL ROLE ${role}`);
                    await tx.unsafe(statement);
                }), (error: unknown) => (error as { code?: string }).code === '42501');
            }
        }
        console.log('PASS: migration, exact RLS/ACLs, mnweb CRUD, public-role denial, idempotency, concurrent add/reorder/merge, no resurrection, cascading delete.');
    } finally {
        await app?.end();
        await database?.end();
        if (created) await admin.unsafe('DROP DATABASE musicnerd_bookmark_verification');
        await admin.end();
    }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
