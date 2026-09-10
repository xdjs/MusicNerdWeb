// @ts-nocheck
import { jest } from '@jest/globals';

describe('long-running artist operation writes', () => {
    beforeEach(() => jest.resetModules());
    async function setup() {
        const { db } = await import('@/server/db/drizzle');
        const tx = { execute: jest.fn().mockResolvedValue([]), insert: jest.fn(), update: jest.fn(), delete: jest.fn(), query: {
            artistClaims: { findFirst: jest.fn().mockResolvedValue({ id: 'replacement', userId: 'new-owner' }) },
        } };
        db.transaction = jest.fn(fn => fn(tx));
        db.select = jest.fn(() => ({ from: jest.fn(() => ({ where: jest.fn().mockResolvedValue([]) })) }));
        const scope = await import('@/server/utils/artistOperationContext');
        const onboarding = await import('../onboardingQueries');
        const vault = await import('../dashboardQueries');
        const jobs = await import('../researchJobQueries');
        const links = await import('@/server/utils/artistLinkService');
        const operations = {
            checkpoint: () => onboarding.confirmOnboardingStep('a1', 'profiles'),
            answer: () => onboarding.upsertInterviewAnswer({ artistId: 'a1', questionKey: 'q', question: 'Q?', answer: 'A', sitting: 1, source: 'onboarding' }),
            offeredQuestions: () => onboarding.recordInterviewBatchOffered('a1', [{ questionKey: 'q', question: 'Q?' }]),
            document: () => onboarding.upsertArtistDoc('a1', 'Stale doc'),
            citations: () => onboarding.upsertArtistDocSources('a1', []),
            discoveredSource: () => vault.insertVaultSource({ artistId: 'a1', url: 'https://example.com' }),
            sourceApproval: () => vault.updateVaultSourceStatus('s1', 'approved'),
            sourceContent: () => vault.updateVaultSourceContent('s1', { extractedText: 'stale' }),
            sourceType: () => vault.updateVaultSourceType('s1', 'article'),
            sourceDelete: () => vault.deleteVaultSource('s1'),
            socialJob: () => jobs.enqueueResearchJob('a1', 'social_ingest'),
            reopenJob: () => jobs.reopenResearchJob('a1', 'social_ingest'),
            linkWrite: () => links.setArtistLink('a1', 'instagram', 'old-owner'),
            linkClear: () => links.clearArtistLink('a1', 'instagram'),
        };
        return { tx, scope, operations };
    }
    it.each(['checkpoint','answer','offeredQuestions','document','citations','discoveredSource','sourceApproval','sourceContent','sourceType','sourceDelete','socialJob','reopenJob','linkWrite','linkClear'])('%s rejects the old operation after revocation', async name => {
        const { tx, scope, operations } = await setup();
        await expect(scope.withArtistOperation('a1', { userId: 'old-owner', expectedClaimId: 'original' }, async () => {
            await Promise.resolve();
            await operations[name]();
        })).rejects.toThrow('ownership changed');
        expect(tx.execute).toHaveBeenCalledTimes(1); // lock only, no job write
        expect(tx.insert).not.toHaveBeenCalled();expect(tx.update).not.toHaveBeenCalled();expect(tx.delete).not.toHaveBeenCalled();
        expect(scope.getActiveArtistOperation()).toBeUndefined();
    });
    it('isolates concurrent operations and rejects cross-artist writes', async () => {
        const { scope, operations } = await setup();
        const result = await Promise.all(['first','second'].map(userId => scope.withArtistOperation('a1', { userId, expectedClaimId: null }, async () => {
            await Promise.resolve();return scope.getArtistOperationOwnership('a1').userId;
        })));
        expect(result).toEqual(['first','second']);
        await expect(scope.withArtistOperation('another', { expectedClaimId: null }, operations.checkpoint)).rejects.toThrow('scope mismatch');
    });
});
