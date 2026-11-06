// @ts-nocheck
import { jest } from '@jest/globals';
import { db } from '@/server/db/drizzle';
jest.mock('@/env', () => ({ SUPABASE_URL: 'https://example.supabase.co' }));

// Track which schema table each tx.delete()/tx.update() call targeted,
// and capture the values written by set() to verify exact bio-null writes.
// Deletes on the claim row and artist_docs use .returning(); the vault/answers/steps
// deletes are awaited directly, so their mock resolves at .where().
function makeTx(docRowsDeleted, pinnedRows = []) {
    const schema = require('@/server/db/schema');
    const deletedTables = [];
    const updatedTables = [];
    const setCalls = [];
    const tx = {
        query: { artistClaims: { findFirst: jest.fn().mockResolvedValue({ id: 'claim-1', artistId: 'artist-1', userId: 'owner', status: 'approved' }) } },
        select: jest.fn(() => ({ from: table => ({ where: () => table === schema.artistVaultSources
            ? { for: () => Promise.resolve([{ id: 'research-1', artistId: 'artist-1', origin: 'research', activityId: null, filePath: null }]) }
            : Promise.resolve([]) }) })),
        insert: jest.fn(() => ({ values: jest.fn().mockResolvedValue(undefined) })),
        execute: jest.fn().mockResolvedValue([]),
        delete: jest.fn((table) => {
            deletedTables.push(table);
            if (table === schema.artistClaims) {
                return { where: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([{ id: 'claim-1', artistId: 'artist-1', status: 'approved', referenceCode: 'MN-TEST' }]) }) };
            }
            if (table === schema.artistDocs) {
                return { where: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue(docRowsDeleted) }) };
            }
            return { where: jest.fn().mockResolvedValue(undefined) };
        }),
        update: jest.fn((table) => {
            updatedTables.push(table);
            return {
                set: jest.fn((values) => {
                    setCalls.push({ table, values });
                    return { where: jest.fn().mockReturnValue(table === schema.artistBioVersions
                        ? { returning: jest.fn().mockResolvedValue(pinnedRows) } : Promise.resolve(undefined)) };
                })
            };
        }),
    };
    return { tx, deletedTables, updatedTables, setCalls };
}

describe('revokeApprovedClaim wipes onboarding content in the same transaction', () => {
    beforeEach(() => jest.clearAllMocks());

    it('deletes vault sources, interview answers, onboarding steps, and the doc; clears bio when a doc existed', async () => {
        const schema = require('@/server/db/schema');
        const { tx, deletedTables, updatedTables, setCalls } = makeTx([{ id: 'doc-1' }]);
        db.transaction = jest.fn(async (cb) => cb(tx));

        const { revokeApprovedClaim } = require('@/server/utils/queries/dashboardQueries');
        const result = await revokeApprovedClaim('claim-1', 'admin');

        expect(result).toMatchObject({ artistId: 'artist-1' });
        // Strict delete order: vault, then scraped social data, then onboarding
        // content, per implementation invariant. (Social posts/profiles added
        // alongside post-claim social ingestion — see socialIngest.ts.)
        expect(deletedTables).toEqual([
            schema.artistClaims, schema.artistResearchJobs, schema.artistSocialCredits, schema.artistDocCorrections, schema.artistVaultSources,
            schema.artistSocialPosts, schema.artistSocialRefreshes, schema.artistSocialProfiles,
            schema.artistInterviewAnswers, schema.artistOnboardingSteps, schema.artistDocs, schema.artistBioProvenance,
        ]);
        const refreshDelete = tx.delete.mock.results[deletedTables.indexOf(schema.artistSocialRefreshes)].value;
        const { PgDialect: RefreshDialect } = require('drizzle-orm/pg-core');
        const refreshScope = new RefreshDialect().sqlToQuery(refreshDelete.where.mock.calls[0][0]);
        expect(refreshScope.params).toEqual(['artist-1']);
        expect(refreshScope.sql).toContain('artist_social_refreshes');
        // A doc was deleted → the (doc-derived or hand-edited) bio is the revoked owner's content
        expect(updatedTables).toEqual([schema.artistBioVersions, schema.artists]);
        expect(setCalls).toContainEqual({ table: schema.artistBioVersions, values: { isPinned: false } });
        expect(tx.execute).toHaveBeenCalledTimes(5); // locking + read lineage + preserve current bio
        const { PgDialect } = require('drizzle-orm/pg-core');
        const { ABOUT_EMPTY_STATE } = require('@/lib/bio/bioConstants');
        const preservation = new PgDialect().sqlToQuery(tx.execute.mock.calls[4][0]);
        expect(preservation.params).toContain(ABOUT_EMPTY_STATE);
        expect(preservation.sql).toContain('btrim(a.bio');
        expect(preservation.sql).toContain('insert into mn_private.artist_bio_version_provenance(version_id,provenance)');
        expect(preservation.sql).toContain('select c.id,c.bio,false');
        expect(preservation.sql).toContain('p.provenance is not distinct from c.provenance');
        expect(deletedTables).toContain(schema.artistBioProvenance);
        // Verify bio was cleared exactly to null (not "" or other value)
        expect(setCalls).toContainEqual({ table: schema.artists, values: { bio: null } });
    });

    it('does NOT clear the bio when no doc row existed (owner never published)', async () => {
        const schema = require('@/server/db/schema');
        const { tx, deletedTables, updatedTables, setCalls } = makeTx([]);
        db.transaction = jest.fn(async (cb) => cb(tx));

        const { revokeApprovedClaim } = require('@/server/utils/queries/dashboardQueries');
        await revokeApprovedClaim('claim-1', 'admin');

        // Still delete claims, vault, and social data, but no onboarding content to clear
        expect(deletedTables).toEqual([
            schema.artistClaims, schema.artistResearchJobs, schema.artistSocialCredits, schema.artistDocCorrections, schema.artistVaultSources,
            schema.artistSocialPosts, schema.artistSocialRefreshes, schema.artistSocialProfiles,
            schema.artistInterviewAnswers, schema.artistOnboardingSteps, schema.artistDocs,
        ]);
        // No artists table update
        expect(updatedTables).toEqual([schema.artistBioVersions]);
        expect(setCalls).not.toContainEqual({ table: schema.artists, values: { bio: null } });
        expect(tx.execute).toHaveBeenCalledTimes(3); // only the row lock
    });

    it('clears a pinned bio even without a doc, releases its lock, and never deletes history', async () => {
        const schema = require('@/server/db/schema');
        const { tx, deletedTables, setCalls } = makeTx([], [{ id: 'pinned-version' }]);
        db.transaction = jest.fn(async cb => cb(tx));
        const { revokeApprovedClaim } = require('@/server/utils/queries/dashboardQueries');
        await revokeApprovedClaim('claim-1', 'admin');
        expect(setCalls).toContainEqual({ table: schema.artistBioVersions, values: { isPinned: false } });
        expect(setCalls).toContainEqual({ table: schema.artists, values: { bio: null } });
        expect(deletedTables).not.toContain(schema.artistBioVersions);
        expect(tx.execute).toHaveBeenCalledTimes(5);
    });
});
