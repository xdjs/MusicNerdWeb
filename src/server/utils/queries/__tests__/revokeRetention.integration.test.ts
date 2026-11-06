/** @jest-environment node */
// @ts-nocheck
import { drizzle } from 'drizzle-orm/pglite';
import { getTableColumns, getTableName } from 'drizzle-orm';
import * as schema from '@/server/db/schema';
import { db } from '@/server/db/drizzle';
import { revokeApprovedClaim } from '../dashboardQueries';
import { getTrustedLoreSourceIds } from '../getTrustedLoreSourceIds';
jest.mock('@/server/db/drizzle', () => ({ db: {} }));
jest.mock('@/env', () => ({ SUPABASE_URL: 'https://example.supabase.co' }));
const { PGlite } = process.getBuiltinModule('module').createRequire(__filename)('@electric-sql/pglite');
const client = new PGlite();
const database = drizzle(client, { schema });
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const artist = id(1), claim = id(2), owner = id(3), source = id(4), activity = id(5);
const tables = [schema.artists, schema.artistClaims, schema.artistVaultSources, schema.artistActivityEvents,
    schema.mcpAuditLog, schema.artistResearchJobs, schema.artistSocialCredits, schema.artistDocCorrections,
    schema.artistSocialPosts, schema.artistSocialRefreshes, schema.artistSocialProfiles,
    schema.artistInterviewAnswers, schema.artistOnboardingSteps, schema.artistDocs, schema.artistBioVersions];
beforeAll(async () => {
    // Local in-memory SQL only: derive column types so production queries are exercised.
    const enums = new Map();
    for (const table of tables) for (const column of Object.values(getTableColumns(table))) {
        if (column.enumValues?.length) enums.set(column.getSQLType(), column.enumValues);
    }
    for (const [name, values] of enums) {
        if (['text', 'varchar'].includes(name)) continue;
        await client.exec(`CREATE TYPE ${name} AS ENUM (${values.map(v => `'${v}'`).join(',')})`);
    }
    for (const table of tables) {
        const columns = Object.values(getTableColumns(table)).map(column =>
            `"${column.name}" ${column.getSQLType()}${column.name === 'id' ? ' PRIMARY KEY DEFAULT gen_random_uuid()' : ''}`);
        await client.exec(`CREATE TABLE "${getTableName(table)}" (${columns.join(',')})`);
    }
    await client.exec('CREATE TABLE retained_versions(source_id uuid REFERENCES artist_vault_sources(id) ON DELETE CASCADE, body text)');
    db.transaction = callback => database.transaction(callback);
    db.execute = async query => (await database.execute(query)).rows;
}, 30000);
afterAll(() => client.close());
beforeEach(async () => {
    await client.exec(`TRUNCATE ${tables.map(getTableName).join(',')},retained_versions CASCADE`);
    await client.query('INSERT INTO artists(id) VALUES($1)', [artist]);
    await client.query('INSERT INTO artist_claims(id,artist_id,user_id,status) VALUES($1,$2,$3,$4)', [claim,artist,owner,'approved']);
    await client.query('INSERT INTO artist_activity_events(id,artist_id,source_id,actor_user_id,actor_kind,action,trigger) VALUES($1,$2,$3,$4,$5,$6,$7)', [activity,artist,source,owner,'user','source_upload','trusted_submission']);
    await client.query('INSERT INTO artist_vault_sources(id,artist_id,activity_id,origin,status,file_path) VALUES($1,$2,$3,$4,$5,$6)', [source,artist,activity,'upload','approved',`${artist}/trusted.pdf`]);
    await client.query('INSERT INTO retained_versions VALUES($1,$2)', [source,'history']);
});
it.each(['approved','pending','rejected'])('preserves trusted %s source, history and object reference', async status => {
    await client.query('UPDATE artist_vault_sources SET status=$1', [status]);
    expect(await revokeApprovedClaim(claim, 'admin')).toMatchObject({ id: claim });
    expect((await client.query('SELECT status,file_path FROM artist_vault_sources')).rows).toEqual([{ status, file_path: `${artist}/trusted.pdf` }]);
    expect((await client.query('SELECT * FROM retained_versions')).rows).toHaveLength(1);
    expect((await client.query('SELECT old_value FROM mcp_audit_log')).rows[0].old_value).not.toContain('trusted.pdf');
    expect(await revokeApprovedClaim(claim, 'admin')).toBeUndefined();
});
it('blocks unknown provenance before any changes', async () => {
    await client.exec('UPDATE artist_vault_sources SET activity_id=null');
    await expect(revokeApprovedClaim(claim, 'admin')).rejects.toThrow('REVOCATION_SOURCE_REVIEW_REQUIRED');
    expect((await client.query('SELECT * FROM artist_claims')).rows).toHaveLength(1);
    expect((await client.query('SELECT * FROM retained_versions')).rows).toHaveLength(1);
    expect((await client.query('SELECT * FROM mcp_audit_log')).rows).toHaveLength(0);
});
it('deletes attributable claimant content and records exact deferred object candidates', async () => {
    await client.exec("UPDATE artist_activity_events SET trigger='dashboard'");
    await revokeApprovedClaim(claim, 'admin');
    expect((await client.query('SELECT * FROM artist_vault_sources')).rows).toHaveLength(0);
    expect(JSON.parse((await client.query('SELECT old_value FROM mcp_audit_log')).rows[0].old_value).sources).toEqual([{ id:source,filePath:`${artist}/trusted.pdf` }]);
});
it('rolls back source and claim deletion if durable receipt cannot be written', async () => {
    await client.exec("UPDATE artist_activity_events SET trigger='dashboard'; ALTER TABLE mcp_audit_log ADD CONSTRAINT reject_receipt CHECK(false) NOT VALID");
    try {
        await expect(revokeApprovedClaim(claim, 'admin')).rejects.toThrow();
        expect((await client.query('SELECT * FROM artist_claims')).rows).toHaveLength(1);
        expect((await client.query('SELECT * FROM artist_vault_sources')).rows).toHaveLength(1);
        expect((await client.query('SELECT * FROM retained_versions')).rows).toHaveLength(1);
    } finally { await client.exec('ALTER TABLE mcp_audit_log DROP CONSTRAINT reject_receipt'); }
});

it.each([
    [`https://example.supabase.co/storage/v1/object/public/vault-files/profile-images/${artist}_123.webp`, null],
    [`https://foreign.example/storage/v1/object/public/vault-files/profile-images/${artist}_123.webp`, `https://foreign.example/storage/v1/object/public/vault-files/profile-images/${artist}_123.webp`],
    ['https://directory.example/artist.jpg', 'https://directory.example/artist.jpg'],
])('clears only managed profile upload references: %s', async (image, expected) => {
    await client.query('UPDATE artists SET custom_image=$1', [image]);
    await revokeApprovedClaim(claim, 'admin');
    expect((await client.query('SELECT custom_image FROM artists')).rows[0].custom_image).toBe(expected);
});

it('preserves public eligibility for trusted inherited Lore after revocation, with privacy/moderation overrides',async()=>{
 await client.exec("update artist_vault_sources set publication='inherit'");
 expect(await getTrustedLoreSourceIds(artist)).toEqual(new Set([source]));
 await revokeApprovedClaim(claim,'admin');
 expect(await getTrustedLoreSourceIds(artist)).toEqual(new Set([source]));
 await client.exec("update artist_vault_sources set publication='private'");
 expect(await getTrustedLoreSourceIds(artist)).toEqual(new Set());
 await client.exec("update artist_vault_sources set publication='inherit',status='rejected'");
 expect(await getTrustedLoreSourceIds(artist)).toEqual(new Set());
});
it('does not infer public trust from mismatched or missing original evidence',async()=>{
 await client.exec("update artist_vault_sources set publication='inherit';update artist_activity_events set source_id=null");
 expect(await getTrustedLoreSourceIds(artist)).toEqual(new Set());
 await expect(revokeApprovedClaim(claim,'admin')).rejects.toThrow('REVOCATION_SOURCE_REVIEW_REQUIRED');
 expect((await client.query('select * from artist_claims')).rows).toHaveLength(1);
});
