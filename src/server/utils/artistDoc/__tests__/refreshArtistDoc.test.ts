// @ts-nocheck
import { jest } from '@jest/globals';

jest.mock('@/server/utils/queries/artistQueries', () => ({ getArtistById: jest.fn() }));
jest.mock('@/server/utils/queries/dashboardQueries', () => ({ getVaultSourcesByArtistId: jest.fn() }));
jest.mock('@/server/utils/queries/docCorrectionQueries', () => ({ getDocCorrections: jest.fn().mockResolvedValue([]) }));
jest.mock('@/server/utils/queries/onboardingQueries', () => ({ getInterviewAnswers: jest.fn(), getArtistDoc: jest.fn() }));
jest.mock('@/server/utils/queries/lorePersistence', () => ({
    getLoreClaimGeneration: jest.fn().mockResolvedValue('claim-1'),
    persistRefreshedLore: jest.fn().mockResolvedValue(true),
}));
jest.mock('@/server/utils/socialIngest', () => ({ getSocialPostsForArtist: jest.fn().mockResolvedValue([]) }));
jest.mock('@/server/lib/ai/generateText', () => ({ generateText: jest.fn() }));
jest.mock('@/server/lib/ai/streamText', () => ({ streamText: jest.fn() }));

describe('refreshArtistDoc', () => {
    beforeEach(() => { jest.resetModules(); jest.clearAllMocks(); });

    async function setup({ geminiText = '## Overview\nA real doc.', posts, vaultSources } = {}) {
        const { getArtistById } = await import('@/server/utils/queries/artistQueries');
        const { getVaultSourcesByArtistId } = await import('@/server/utils/queries/dashboardQueries');
        const { getInterviewAnswers, getArtistDoc } = await import('@/server/utils/queries/onboardingQueries');
        const { getSocialPostsForArtist } = await import('@/server/utils/socialIngest');
        const { generateText } = await import('@/server/lib/ai/generateText');
        const generateContent = jest.fn().mockResolvedValue({ text: geminiText });
        generateText.mockImplementation(generateContent);
        const { streamText } = await import('@/server/lib/ai/streamText');
        streamText.mockImplementation(generateContent);
        getArtistById.mockResolvedValue({ id: 'a1', name: 'Nova Reyes', spotify: 'spot123', instagram: 'novareyes' });
        getVaultSourcesByArtistId.mockResolvedValue(vaultSources ?? [
            // Long enough to be CITABLE: a source is only usable as evidence if we
            // actually fetched and read the page, and stored body text is that record.
            { id: 'source-1', title: 'Pitchfork review', url: 'https://pitchfork.com/x', snippet: 'bedroom auteur', extractedText: 'the review text '.repeat(40) },
        ]);
        getInterviewAnswers.mockResolvedValue([
            { questionKey: 'sound_in_own_words', question: 'Sound?', answer: 'heartbreak you can dance to', source: 'onboarding' },
            { questionKey: 'offline_fact', question: 'Offline?', answer: null, source: 'onboarding' },
        ]);
        getSocialPostsForArtist.mockResolvedValue(posts ?? []);
        const svc = { ...(await import('@/server/utils/artistDocService')), ...(await import('@/server/utils/artistDoc/refreshArtistDoc')) };
        return { svc, generateContent, getArtistDoc };
    }

    it('refresh captures ownership before synthesis and passes the job identity to guarded persistence', async () => {
        const { svc, generateContent } = await setup();
        const { getLoreClaimGeneration, persistRefreshedLore } = await import('@/server/utils/queries/lorePersistence');
        expect(await svc.refreshArtistDoc('a1', { createIfMissing: true, jobId: 'j1' })).toBe('rebuilt');
        expect(getLoreClaimGeneration.mock.invocationCallOrder[0]).toBeLessThan(generateContent.mock.invocationCallOrder[0]);
        expect(persistRefreshedLore).toHaveBeenCalledWith('a1', expect.any(String), expect.any(Array), 'claim-1', 'j1', expect.objectContaining({ text: expect.any(String), sourceKey: expect.any(String) }));
    });

    it('refresh reports cancellation if ownership changed while synthesis ran', async () => {
        const { svc } = await setup();
        const { persistRefreshedLore } = await import('@/server/utils/queries/lorePersistence');
        persistRefreshedLore.mockResolvedValue(false);
        expect(await svc.refreshArtistDoc('a1', { createIfMissing: true, jobId: 'j1' })).toBe('cancelled');
    });

    it('refreshes the document without requesting deletion when only overview generation fails', async () => {
        const { svc, generateContent } = await setup();
        const { persistRefreshedLore } = await import('@/server/utils/queries/lorePersistence');
        generateContent.mockImplementation(async request => {
            if (request.instructions?.includes('Lore source collection')) throw new Error('temporary outage');
            return { text: '## Overview\nThe refreshed document.' };
        });
        expect(await svc.refreshArtistDoc('a1', { createIfMissing: true, jobId: 'j1' })).toBe('rebuilt');
        expect(persistRefreshedLore).toHaveBeenCalledWith('a1', expect.stringContaining('The refreshed document.'),
            expect.any(Array), 'claim-1', 'j1', undefined);
    });
});
