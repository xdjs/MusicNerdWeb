// @ts-nocheck
import { jest } from '@jest/globals';

jest.mock('@/server/utils/analytics/trackServerEvent', () => ({ trackServerEvent: jest.fn() }));
jest.mock('@/server/utils/queries/artistQueries', () => ({
    getArtistById: jest.fn().mockResolvedValue({ id: 'artist', name: 'LATASHÁ' }),
    findArtistsByInstagram: jest.fn().mockResolvedValue([]),
    findUniqueArtistsByName: jest.fn().mockResolvedValue(new Map()),
}));
jest.mock('@/server/utils/queries/dashboardQueries', () => ({ getVaultSourcesByArtistId: jest.fn().mockResolvedValue([]) }));
jest.mock('@/server/utils/artistDocService', () => ({ getArtistDocContext: jest.fn().mockResolvedValue('') }));
jest.mock('@/server/lib/ai/generateText', () => ({ generateText: jest.fn() }));
jest.mock('@/server/lib/ai/generateArray', () => ({ generateArray: jest.fn().mockResolvedValue([]) }));
jest.mock('@/server/utils/queries/externalApiQueries', () => ({ getSpotifyHeaders: jest.fn().mockResolvedValue({}) }));
jest.mock('@/server/utils/queries/socialCreditQueries', () => ({ getSocialCredits: jest.fn() }));
jest.mock('@/server/utils/queries/onboardingQueries', () => ({ getInterviewAnswers: jest.fn().mockResolvedValue([]) }));
jest.mock('@/server/utils/socialIngest', () => ({ getRecentOwnPosts: jest.fn() }));

let generateText, getRecentOwnPosts, getSocialCredits;

if (!('json' in Response)) {
    Response.json = (data, init) => new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) }, status: init?.status || 200,
    });
}

async function ask() {
    const { POST } = await import('../route');
    const res = await POST(new Request('http://localhost/api/askArtist', {
        method: 'POST', body: JSON.stringify({ artistId: 'artist', question: 'What is her latest project?' }),
    }));
    expect(res.status).toBe(200);
    return res.json();
}

beforeEach(async () => {
    ({ generateText } = await import('@/server/lib/ai/generateText'));
    ({ getRecentOwnPosts } = await import('@/server/utils/socialIngest'));
    ({ getSocialCredits } = await import('@/server/utils/queries/socialCreditQueries'));
    jest.clearAllMocks();
    getRecentOwnPosts.mockResolvedValue([
        { caption: 'Executive producers @cxy and @whoiseli. Music by @liv.corp.', url: 'https://www.instagram.com/p/album/', postedAt: '2026-09-25T00:00:00Z' },
        { caption: 'An unrelated post by @uncited', url: 'https://www.instagram.com/p/other/', postedAt: '2026-09-24T00:00:00Z' },
    ]);
    getSocialCredits.mockResolvedValue({ credits: [], statements: [] });
    generateText.mockResolvedValue({ text: 'Produced by @cxy and @WHOISELI, with @uncited and @invented [1].' });
});

it('wires source-backed caption mentions through the real route without requiring extracted credits', async () => {
    const body = await ask();
    expect(body.instagramMentions).toEqual(['cxy', 'whoiseli']);
    expect(body.sources.map(s => s.n)).toEqual([1]);
    expect(body).not.toHaveProperty('instagramEvidence');
});

it('uses cited stored statement quotes, not inferred names or every stored post', async () => {
    getSocialCredits.mockResolvedValue({ credits: [], statements: [{
        quote: 'Album made with @cxy', topic: 'Album announcement', url: 'https://instagram.com/reel/album/',
    }] });
    generateText.mockResolvedValue({ text: 'With @cxy and @whoiseli [3].' });
    expect((await ask()).instagramMentions).toEqual(['cxy']);
});

it('does not link uncited, truncated, non-Instagram or invented evidence', async () => {
    getRecentOwnPosts.mockResolvedValue([
        { caption: 'x'.repeat(410) + ' @cxy', url: 'https://www.instagram.com/p/album/' },
        { caption: 'With @whoiseli', url: 'https://instagram.com.evil.test/p/album/' },
    ]);
    generateText.mockResolvedValue({ text: '@cxy and @whoiseli [1, 2].' });
    expect((await ask()).instagramMentions).toEqual([]);
});

it('does not reuse local citation numbers after falling back to the open web', async () => {
    generateText.mockResolvedValueOnce({ text: 'INSUFFICIENT' }).mockResolvedValueOnce({ text: 'With @cxy [1].' });
    const body = await ask();
    expect(body.fromOpenWeb).toBe(true);
    expect(body.instagramMentions).toEqual([]);
});

it('never links a handle cut in half by the context budget', async () => {
    getRecentOwnPosts.mockResolvedValue([{ caption: 'x'.repeat(395) + ' @whoiseli', url: 'https://www.instagram.com/p/album/' }]);
    generateText.mockResolvedValue({ text: 'With @who [1].' });
    expect((await ask()).instagramMentions).toEqual([]);
    expect(generateText.mock.calls[0][0].instructions).not.toContain('@who');
});

it('checks the original credit quote instead of trusting an extracted handle alone', async () => {
    getRecentOwnPosts.mockResolvedValue([]);
    getSocialCredits.mockResolvedValue({ statements: [], credits: [{
        subject: 'cxy', isHandle: true, isSelf: false, role: 'Executive producer', quote: 'Executive producer @cxy', url: 'https://instagram.com/p/album/',
    }, {
        subject: 'invented', isHandle: true, isSelf: false, role: 'Producer', quote: 'Producer unknown', url: 'https://instagram.com/p/other/',
    }] });
    generateText.mockResolvedValue({ text: 'With @cxy and @invented [1, 2].' });
    expect((await ask()).instagramMentions).toEqual(['cxy']);
});

it('cites the handle-bearing post when a grouped collaborator starts with a bare-name credit', async () => {
    getRecentOwnPosts.mockResolvedValue([]);
    getSocialCredits.mockResolvedValue({ statements: [], credits: [{
        subject: 'C X Y', isHandle: false, isSelf: false, role: 'Producer',
        quote: 'Produced by C X Y, with @firstonly', url: 'https://instagram.com/p/bare-name/',
    }, {
        subject: 'someoneelse', isHandle: true, isSelf: false, role: 'Producer',
        quote: 'Thanks @cxy and @someoneelse', url: 'https://instagram.com/p/unrelated/',
    }, {
        subject: 'cxy', isHandle: true, isSelf: false, role: 'Executive producer',
        quote: 'Executive producer @CxY', url: 'https://instagram.com/p/handle-credit/',
    }] });
    generateText.mockResolvedValue({ text: 'With @cxy and @firstonly and @someoneelse [1].' });
    const body = await ask();
    expect(body.instagramMentions).toEqual(['cxy']);
    expect(body.sources).toEqual([expect.objectContaining({ n: 1, url: 'https://instagram.com/p/handle-credit/' })]);
});
