/** Disposable local PostgreSQL harness for #1134. Never accepts a remote database. */
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { generateDrizzleJson, generateMigration } from 'drizzle-kit/api';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import * as schema from '../src/server/db/schema';

async function main() {
    const connection = process.env.SELF_EDIT_LOCAL_OWNER_URL;
    if (!connection) throw new Error('Set SELF_EDIT_LOCAL_OWNER_URL for a fresh, disposable local database');
    const url = new URL(connection);
    assert(['localhost', '127.0.0.1'].includes(url.hostname), 'Local database only');
    assert.equal(url.pathname, '/self_edit1134', 'Use the disposable self_edit1134 database');
    const owner = postgres(connection, { max: 1 });
    try {
        await owner.unsafe(`DO $$ BEGIN
            IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='mnweb') THEN CREATE ROLE mnweb LOGIN; END IF;
            IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
            IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
            END $$;
            CREATE FUNCTION uuid_generate_v4() RETURNS uuid LANGUAGE SQL AS 'SELECT gen_random_uuid()';`);
        const baseSchema = { artists: schema.artists, users: schema.users, ugcresearch: schema.ugcresearch,
            mcpAuditLog: schema.mcpAuditLog, artistClaims: schema.artistClaims,
            claimStatus: schema.claimStatus, urlmap: schema.urlmap, platformType: schema.platformType };
        // Legacy non-unique index metadata contains known drift (#1148); keep this
        // fixture limited to tables, keys and the exact new migration below.
        for (const statement of await generateMigration(generateDrizzleJson({}), generateDrizzleJson(baseSchema))) {
            if (/^CREATE (TABLE|TYPE|UNIQUE INDEX)/.test(statement) || statement.includes('ADD CONSTRAINT')) await owner.unsafe(statement);
        }
        await owner.unsafe('GRANT USAGE ON SCHEMA public TO mnweb; GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO mnweb;');
        await owner.unsafe(readFileSync('drizzle/0027_artist_self_edits.sql', 'utf8'));
        const seed = drizzle(owner, { schema });
        const userId = '00000000-0000-4000-8000-000000001135';
        const artistId = '00000000-0000-4000-8000-000000001134';
        const claimId = '00000000-0000-4000-8000-000000001137';
        await seed.insert(schema.users).values({ id: userId, username: 'Local Artist Owner', legacyLinkDismissed: true });
        await seed.insert(schema.artists).values({ id: artistId, name: 'Self Edit Fixture', createdAt: '2020-01-01T00:00:00Z' });
        await seed.insert(schema.artistClaims).values({ id: claimId, artistId, userId, status: 'approved' });
        await seed.insert(schema.urlmap).values({ siteName: 'instagram', siteUrl: 'https://instagram.com',
            example: 'https://instagram.com/example', appStringFormat: 'https://instagram.com/{id}',
            isWeb3Site: false, cardPlatformName: 'Instagram', regex: '^https://(?:www\\.)?instagram\\.com/([^/?#]+)/?$' });
        url.username = 'mnweb'; url.password = '';
        process.env.SUPABASE_DB_CONNECTION = url.toString();
        const { setArtistLink } = await import('../src/server/utils/artistLinkService');
        const { withArtistOperation } = await import('../src/server/utils/artistOperationContext');
        const { db } = await import('../src/server/db/drizzle');
        // Different DB connections race through the actual lock + writer.
        await Promise.all(Array.from({ length: 12 }, () => withArtistOperation(
            artistId, { userId, expectedClaimId: claimId },
            () => setArtistLink(artistId, 'instagram', 'concurrent', 'https://instagram.com/concurrent'),
        )));
        const events = await db.query.artistSelfEdits.findMany();
        assert.equal(events.length, 1);
        assert.equal(events[0]?.newValue, 'concurrent');
        assert.equal((await db.query.artists.findFirst())?.instagram, 'concurrent');
        assert.equal((await db.query.ugcresearch.findMany()).length, 0);
        console.log('PASS: 12 simultaneous identical writes -> one event; mnweb link/event writes succeeded; zero UGC rows.');
        // Reproduce revokeApprovedClaim's claim -> artist order on another connection.
        // The edit must complete while the revocation holds the claim lock; waiting
        // for that claim would invert the two lock orders and deadlock.
        try {
            await owner.begin(async tx => {
                await tx`DELETE FROM artist_claims WHERE id = ${claimId}`;
                let timer: ReturnType<typeof setTimeout> | undefined;
                try {
                    await Promise.race([
                        withArtistOperation(artistId, { userId, expectedClaimId: claimId },
                            () => setArtistLink(artistId, 'instagram', 'overlap', 'https://instagram.com/overlap')),
                        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Edit blocked on revocation claim lock')), 3000); }),
                    ]);
                    await tx`SELECT id FROM artists WHERE id = ${artistId} FOR UPDATE`;
                } finally { clearTimeout(timer); }
                throw new Error('ROLLBACK_DISPOSABLE_REVOCATION');
            });
        } catch (error) {
            if (!(error instanceof Error) || error.message !== 'ROLLBACK_DISPOSABLE_REVOCATION') throw error;
        }
        assert.equal((await db.query.artistSelfEdits.findMany()).length, 2);
        assert.equal((await db.query.artists.findFirst())?.instagram, 'overlap');
        assert.equal((await db.query.ugcresearch.findMany()).length, 0);
        console.log('PASS: concurrent claim revocation lock does not block or deadlock self-edit; changed link and event both commit.');
        // postgres-js' production pool remains live; exit after owner cleanup below.
    } finally { await owner.end(); }
}
main().then(() => process.exit(0), error => { console.error(error); process.exit(1); });
