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

describe('artistDocService', () => {
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



    it('generates a source inventory without sending extracted text or URLs', async () => {
        const { svc, generateContent } = await setup({ geminiText: 'A journal and a conversation.', vaultSources: [
            { id: 'd', title: 'Studio journal', type: 'document', extractedText: 'private raw payload', url: 'https://example.com/doc' },
            { id: 'a', title: 'Conversation', type: 'audio' },
        ] });
        const summary = await svc.generateLoreSummary('a1');
        expect(summary.text).toBe('A journal and a conversation.');
        const call = generateContent.mock.calls[0][0];
        expect(call.prompt).toContain('Studio journal');
        expect(call.prompt).toContain('audio');
        expect(call.prompt).not.toContain('private raw payload');
        expect(call.prompt).not.toContain('https://');
    });
    it('does not generate a summary for an empty source set', async () => {
        const { svc, generateContent } = await setup({ vaultSources: [] });
        expect(await svc.generateLoreSummary('a1')).toBeNull();
        expect(generateContent).not.toHaveBeenCalled();
    });
    it('tolerates failed or oversized summaries', async () => {
        const { svc, generateContent } = await setup({ geminiText: 'x'.repeat(901) });
        expect(await svc.generateLoreSummary('a1')).toBeUndefined();
        generateContent.mockRejectedValueOnce(new Error('provider unavailable'));
        expect(await svc.generateLoreSummary('a1')).toBeUndefined();
    });







    // The About and the auto-generated bio write to the same artists.bio field and
    // render in the same place, so they answer to one length rule — production's,
    // in artistBioQuery. The old "2-4 short paragraphs" set a two-paragraph FLOOR,
    // which is what made an About written through onboarding read twice as long as
    // one generated automatically.
    it('both About prompts carry production\'s one-paragraph length rule', async () => {
        const { svc, generateContent } = await setup({ geminiText: 'An About.' });

        await svc.generateAboutFromDoc('Nova Reyes', '## Overview\ndoc');
        const cited = generateContent.mock.calls[0][0].instructions;
        expect(cited).toContain('ONE paragraph, up to ~100 words');
        expect(cited).toContain('Stop when the facts run out');
        expect(cited).not.toContain('2-4 short paragraphs');

        await svc.synthesizeFallbackAbout('a1', 'Nova Reyes', '## Overview\ndoc');
        const fallback = generateContent.mock.calls[1][0].instructions;
        expect(fallback).toContain('ONE paragraph, up to ~100 words');
        expect(fallback).not.toContain('2-4 short paragraphs');
    });

    // Length was ported from production but structure wasn't, so the About opened
    // mid-catalogue ("Pete Rango has released several collaborative tracks...") with
    // no sentence saying who he is. Production leads with the identity line.
    it('both About prompts carry production\'s opening rule', async () => {
        const { svc, generateContent } = await setup({ geminiText: 'An About.' });

        // Assert against the CONSTANT, not its current wording — this test is
        // about both prompts sharing one rule, not about how it is phrased.
        const { ABOUT_OPENING_RULE } = await import('@/lib/bio/bioConstants');

        await svc.generateAboutFromDoc('Nova Reyes', '## Overview\ndoc');
        expect(generateContent.mock.calls[0][0].instructions)
            .toContain(ABOUT_OPENING_RULE);

        await svc.synthesizeFallbackAbout('a1', 'Nova Reyes', '## Overview\ndoc');
        expect(generateContent.mock.calls[1][0].instructions)
            .toContain(ABOUT_OPENING_RULE);
    });

    // A pull-quote inside a ~100-word encyclopedia-style bio reads wrong, and the
    // automatic generator never quoted anyone. The interview facts still reach the
    // About — only the quotation marks go.
    it('neither About prompt asks to carry the artist\'s words over verbatim', async () => {
        const { svc, generateContent } = await setup({ geminiText: 'An About.' });

        await svc.generateAboutFromDoc('Nova Reyes', '## Overview\ndoc');
        const cited = generateContent.mock.calls[0][0].instructions;
        expect(cited).not.toMatch(/keep the quote/i);
        expect(cited).toMatch(/no quotation marks/i);

        await svc.synthesizeFallbackAbout('a1', 'Nova Reyes', '## Overview\ndoc');
        const fallback = generateContent.mock.calls[1][0].instructions;
        expect(fallback).not.toMatch(/keep the quote/i);
        expect(fallback).toMatch(/no quotation marks/i);
    });

    it('getArtistDocContext caps the slice and returns null with no doc', async () => {
        const { svc, getArtistDoc } = await setup();
        getArtistDoc.mockResolvedValueOnce(undefined);
        await expect(svc.getArtistDocContext('a1')).resolves.toBeNull();
        getArtistDoc.mockResolvedValueOnce({ content: 'y'.repeat(10_000) });
        const ctx = await svc.getArtistDocContext('a1');
        expect(ctx.length).toBe(svc.ARTIST_DOC_CONTEXT_CAP);
    });

    describe('citations', () => {
        it('excludes sources whose page was never read — a model-written snippet is not evidence', async () => {
            const { svc } = await setup();
            const { getVaultSourcesByArtistId } = await import('@/server/utils/queries/dashboardQueries');
            getVaultSourcesByArtistId.mockResolvedValue([
                { title: 'Real', url: 'https://real.example/x', snippet: 'from the page', extractedText: 'body text '.repeat(60) },
                // Fetched nothing. Its snippet is Gemini's description of a search
                // result, not text from the page — a published About once cited one
                // of these for a claim the live page did not contain.
                { title: 'Unread', url: 'https://unread.example/y', snippet: 'a model wrote this', extractedText: null },
                // Grounding-redirect tokens expire and then 404, whatever text was
                // captured when they were stored.
                { title: 'Expired', url: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/T', snippet: 's', extractedText: 'body text '.repeat(60) },
            ]);
            const sources = await svc.buildDocSources('a1');
            expect(sources.filter(s => s.kind === 'vault')).toEqual([
                { id: 1, kind: 'vault', label: 'Real', url: 'https://real.example/x' , publishedAt: null },
            ]);
        });

        it('buildDocSources numbers vault sources then interview answers, skipping skipped answers', async () => {
            const { svc } = await setup();
            const sources = await svc.buildDocSources('a1');
            expect(sources).toEqual([
                { id: 1, kind: 'vault', label: 'Pitchfork review', url: 'https://pitchfork.com/x' , publishedAt: null },
                { id: 2, kind: 'interview', label: 'Their own words — "Sound?"', url: null },
            ]);
        });

        it('buildDocSources adds a numbered source per confirmed collaborator and track credit', async () => {
            const { svc } = await setup({
                posts: [
                    {
                        platform: 'instagram', platformPostId: 'p1', ownerUsername: 'novareyes', isOwnPost: true,
                        caption: 'studio day', url: 'https://instagram.com/p/collab', postedAt: '2026-01-01T00:00:00Z',
                        likeCount: 10, commentCount: 1, playCount: null,
                        hashtags: [], mentions: [], coauthors: ['dameatlas'],
                        musicTitle: 'Song Title', musicArtist: 'Nova Reyes, Dame Atlas',
                    },
                ],
            });
            const sources = await svc.buildDocSources('a1');
            const social = sources.filter(s => s.kind === 'social');
            expect(social).toEqual([
                { id: 3, kind: 'social', label: 'Instagram collaboration with @dameatlas', url: 'https://instagram.com/p/collab' },
                { id: 4, kind: 'social', label: 'Track credit — "Song Title" (Nova Reyes, Dame Atlas)', url: 'https://instagram.com/p/collab' },
            ]);
        });








        it('extractCitedIds finds every marker id in a string', async () => {
            const { svc } = await setup();
            expect([...svc.extractCitedIds('a[1] b[2][5] c')].sort()).toEqual([1, 2, 5]);
        });

        it('stripCitationMarkers removes every marker regardless of validity, leaving plain prose', async () => {
            const { svc } = await setup();
            expect(svc.stripCitationMarkers('Cited Lauryn Hill as an influence[3] and Solange[3].'))
                .toBe('Cited Lauryn Hill as an influence and Solange.');
            expect(svc.stripCitationMarkers('No markers here.')).toBe('No markers here.');
        });

        it('strips GROUPED markers, which is what a sentence resting on two sources gets', async () => {
            // The regex matched a single number only, so "[3]" went and
            // "[3, 4]" stayed — and the model groups them whenever a sentence
            // rests on more than one source, which is often. Pete Rango's
            // published About read "...creative empowerment and education
            // [3, 4]." with nothing rendering those numbers as anything.
            //
            // Not just cosmetic: artist.bio is what the artist page feeds to
            // summarize() for its meta description, so the brackets reached
            // the Google snippet.
            const svc = await import('../artistDocService');
            expect(svc.stripCitationMarkers('and education [3, 4]. Rango composes soundscapes [2, 3].'))
                .toBe('and education. Rango composes soundscapes.');
            expect(svc.stripCitationMarkers('spaced [1 , 2] and tight[4,5,6] both go'))
                .toBe('spaced and tight both go');
        });

        it('leaves square brackets that are prose, not citations, alone', async () => {
            const svc = await import('../artistDocService');
            expect(svc.stripCitationMarkers('the label [now defunct] released it'))
                .toBe('the label [now defunct] released it');
        });
    });
});


describe("stripCitationMarkers — punctuation left behind", () => {
    it("does not leave a space before the period when the model spaces its marker", async () => {
        // Real output from a live run: "...now based in Miami, FL [1]." The
        // prompt asks for no space before the marker and the model does not
        // always comply — and the auto-build stores this exact string as the
        // artist's published bio, so the artefact is visible on their page.
        const { stripCitationMarkers } = await import("@/server/utils/artistDocService");
        expect(stripCitationMarkers("Pete Rango is a producer based in Miami, FL [1]."))
            .toBe("Pete Rango is a producer based in Miami, FL.");
    });

    it("still handles the well-formed case, and mid-sentence markers", async () => {
        const { stripCitationMarkers } = await import("@/server/utils/artistDocService");
        expect(stripCitationMarkers("He founded XUE RECORDS[2]. His work aired on HBO[3]."))
            .toBe("He founded XUE RECORDS. His work aired on HBO.");
        expect(stripCitationMarkers("a hardcore band [4], then electronic music [5]."))
            .toBe("a hardcore band, then electronic music.");
    });

    it("never pulls a paragraph break out with a marker at the start of a line", async () => {
        const { stripCitationMarkers } = await import("@/server/utils/artistDocService");
        expect(stripCitationMarkers("First line.\n[1] Second line.")).toBe("First line.\nSecond line.");
    });
});

describe("source text selection — the best material is rarely at the top", () => {
    it("keeps paragraphs that name the artist over ones that merely came first", async () => {
        // Real failure: a 5,000-character profile carried "featured in HBO's
        // Insecure" at character 2,466, and a 2,000-character HEAD slice cut it.
        // The artist's About read as a summary of his childhood and never
        // mentioned the credit, because an interview opens with childhood and
        // puts the career in the middle.
        const { selectSourceText } = await import("@/server/utils/artistDocService");
        const filler = "Richmond has a long history of independent venues and community radio. ".repeat(60);
        const credit = "\n\nPete Rango landed a placement for his song on HBO's Insecure.\n\n";
        const text = filler + credit + filler;
        expect(text.indexOf("HBO")).toBeGreaterThan(2000); // the condition that broke it

        const selected = selectSourceText(text, "Pete Rango");
        expect(selected).toContain("HBO");
    });

    it("returns short text untouched", async () => {
        const { selectSourceText } = await import("@/server/utils/artistDocService");
        const short = "Pete Rango is a producer from Bogota.";
        expect(selectSourceText(short, "Pete Rango")).toBe(short);
    });

    it("falls back to a head slice when the text has no paragraph structure", async () => {
        // Legacy rows: every source stored before extractReadableText landed was
        // flattened to a single line at scrape time, so there are no paragraphs
        // to choose between and the head slice is all this can do. Sized past
        // SOURCE_TEXT_BUDGET deliberately — under it, text is returned whole.
        const { selectSourceText, SOURCE_TEXT_BUDGET } = await import("@/server/utils/artistDocService");
        const blob = "x".repeat(SOURCE_TEXT_BUDGET + 3000);
        const out = selectSourceText(blob, "Pete Rango");
        expect(out.length).toBe(SOURCE_TEXT_BUDGET);
    });
});
