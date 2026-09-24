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

describe('generateAboutFromDoc', () => {
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
        const svc = { ...(await import('@/server/utils/artistDocService')), ...(await import('@/server/utils/artistDoc/generateAboutFromDoc')) };
        return { svc, generateContent, getArtistDoc };
    }

    it('generateAboutFromDoc returns trimmed text within MAX_BIO_LENGTH', async () => {
        const { svc, generateContent } = await setup({ geminiText: '  A concrete About.  ' });
        await expect(svc.generateAboutFromDoc('Nova Reyes', '## Overview\ndoc')).resolves.toBe('A concrete About.');
        const call = generateContent.mock.calls[0][0];
        expect(call.googleSearch).toBeFalsy(); // ungrounded by design
        expect(call.instructions).toContain('About');
    });

    it('generateAboutFromDoc strips a marker not present in the passed sources list', async () => {
        const { svc } = await setup({ geminiText: 'They cited Lauryn Hill[1] and something unverifiable[7].' });
        const sources = [{ id: 1, kind: 'vault', label: 'SoundBetter profile', url: 'https://soundbetter.com/profiles/x' , publishedAt: null }];
        const about = await svc.generateAboutFromDoc('Nova Reyes', '## Overview\ndoc', sources);
        expect(about).toContain('Lauryn Hill[1]');
        expect(about).not.toContain('[7]');
    });

    it('streams through streamText and hands each delta to onTextDelta', async () => {
        const { svc } = await setup();
        const { streamText } = await import('@/server/lib/ai/streamText');
        const { generateText } = await import('@/server/lib/ai/generateText');
        streamText.mockImplementation(async ({ onTextDelta }) => {
            onTextDelta?.('## Overview\n');
            onTextDelta?.('A real doc.');
            return { text: '## Overview\nA real doc.' };
        });
        const deltas = [];
        await expect(svc.generateAboutFromDoc('Nova Reyes', '## Overview\\ndoc', [], { onTextDelta: d => deltas.push(d) })).resolves.toBe('## Overview\nA real doc.');
        expect(deltas).toEqual(['## Overview\n', 'A real doc.']);
        expect(generateText).not.toHaveBeenCalled();
    });

    it('still works for callers that pass no onTextDelta', async () => {
        const { svc } = await setup({ geminiText: '## Overview\nA doc.' });
        const { streamText } = await import('@/server/lib/ai/streamText');
        await expect(svc.generateAboutFromDoc('Nova Reyes', 'doc')).resolves.toBe('## Overview\nA doc.');
        expect(streamText).toHaveBeenCalledTimes(1);
        expect(streamText.mock.calls[0][0].onTextDelta).toBeUndefined();
    });
});
