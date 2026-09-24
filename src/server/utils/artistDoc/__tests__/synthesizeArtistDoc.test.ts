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

describe('synthesizeArtistDoc', () => {
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
        const svc = { ...(await import('@/server/utils/artistDocService')), ...(await import('@/server/utils/artistDoc/synthesizeArtistDoc')) };
        return { svc, generateContent, getArtistDoc };
    }

    it('synthesizeArtistDoc feeds sources AND interview answers to Gemini, skipping skipped answers', async () => {
        const { svc, generateContent } = await setup();
        const doc = await svc.synthesizeArtistDoc('a1');
        expect(doc).toContain('## Overview');
        const call = generateContent.mock.calls[0][0];
        expect(call.prompt).toContain('Pitchfork review');
        expect(call.prompt).toContain('heartbreak you can dance to');
        expect(call.prompt).not.toContain('Offline?'); // skipped answers are omitted, not sent as empties
        expect(call.instructions).toContain('Story hooks');
        // Fictional sample anecdotes previously leaked into a real artist's Lore.
        expect(call.instructions).not.toContain('the pantry');
        expect(call.instructions).not.toContain('Marisol');
        expect(call.instructions).not.toContain('Late Bus');
        expect(call.googleSearch).toBeFalsy(); // ungrounded by design
    });

    it('synthesizeArtistDoc hard-truncates at ARTIST_DOC_MAX_CHARS', async () => {
        const { svc } = await setup({ geminiText: 'x'.repeat(30_000) });
        const doc = await svc.synthesizeArtistDoc('a1');
        expect(doc.length).toBe(svc.ARTIST_DOC_MAX_CHARS);
    });

    it('synthesizeArtistDoc strips a citation marker that does not resolve to a real source id, keeps valid ones', async () => {
        // Only 2 real sources exist (vault [1], interview [2]) — [1] is valid, [99] is hallucinated.
        const { svc } = await setup({ geminiText: '## Overview\nCited Lauryn Hill as an influence[1]. Also claims something[99].' });
        const doc = await svc.synthesizeArtistDoc('a1');
        expect(doc).toContain('influence[1]');
        expect(doc).not.toContain('[99]');
    });

    it('synthesizeArtistDoc feeds a numbered SOURCES manifest and citation instructions to Gemini', async () => {
        const { svc, generateContent } = await setup();
        await svc.synthesizeArtistDoc('a1');
        const call = generateContent.mock.calls[0][0];
        expect(call.prompt).toContain('[1] Source (date unknown): Pitchfork review');
        expect(call.prompt).toContain('NUMBERED SOURCES');
        expect(call.instructions).toContain('CITATIONS');
        expect(call.instructions).toContain('ANTI-INFLATION');
    });

    it("puts the artist's corrections in the prompt, above the sources", async () => {
        // The document is regenerated whenever sources change, so a correction
        // typed INTO it would appear to save and then vanish. Corrections live
        // outside it and must be re-applied on every rebuild.
        const { getDocCorrections } = await import('@/server/utils/queries/docCorrectionQueries');
        getDocCorrections.mockResolvedValue([
            { id: 'c1', claim: 'Parris Pierce is his production partner', kind: 'fix', correction: 'They worked together 2018-2019, not since.' },
            { id: 'c2', claim: 'He has worked with Black Youngsta', kind: 'wrong', correction: null },
        ]);
        const { svc, generateContent } = await setup();
        await svc.synthesizeArtistDoc('a1');
        const sent = generateContent.mock.calls[0][0].prompt;
        expect(sent).toContain('CORRECTIONS FROM THE ARTIST');
        expect(sent).toContain('They worked together 2018-2019, not since.');
        // A "wrong" correction must read as a removal, not as a fact to keep.
        expect(sent).toMatch(/REMOVE[^\n]*Black Youngsta/);
        expect(generateContent.mock.calls[0][0].instructions).toContain('CORRECTIONS —');
    });

    it("omits the corrections block entirely when there are none", async () => {
        const { getDocCorrections } = await import('@/server/utils/queries/docCorrectionQueries');
        getDocCorrections.mockResolvedValue([]);
        const { svc, generateContent } = await setup();
        await svc.synthesizeArtistDoc('a1');
        expect(generateContent.mock.calls[0][0].prompt).not.toContain('CORRECTIONS FROM THE ARTIST');
    });

    it('labels every source with its age, so a claim can be scoped in time', async () => {
        // "Parris Pierce is my production partner" reached a real artist's
        // profile in the present tense, from an interview published in 2019.
        // The doc had an anti-inflation rule telling it to scope claims in
        // time and no way to obey it: nothing in its material said when
        // anything happened.
        const { svc, generateContent } = await setup({
            vaultSources: [{ id: 'v1', url: 'https://voyagemia.com/x', title: 'Meet Nova', snippet: '', extractedText: 'Nova Reyes said something. '.repeat(40), status: 'approved', publishedAt: '2019-01-10' }],
        });
        await svc.synthesizeArtistDoc('a1');
        const call = generateContent.mock.calls[0][0];
        expect(call.prompt).toMatch(/\[1\] Source \(published 2019-01-10, \d+ years ago\)/);
        expect(call.instructions).toContain('TIME —');
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
        await expect(svc.synthesizeArtistDoc('a1', undefined, { onTextDelta: d => deltas.push(d) })).resolves.toBe('## Overview\nA real doc.');
        expect(deltas).toEqual(['## Overview\n', 'A real doc.']);
        expect(generateText).not.toHaveBeenCalled();
    });

    it('still works for callers that pass no onTextDelta', async () => {
        const { svc } = await setup({ geminiText: '## Overview\nA doc.' });
        const { streamText } = await import('@/server/lib/ai/streamText');
        await expect(svc.synthesizeArtistDoc('a1')).resolves.toBe('## Overview\nA doc.');
        expect(streamText).toHaveBeenCalledTimes(1);
        expect(streamText.mock.calls[0][0].onTextDelta).toBeUndefined();
    });
});
