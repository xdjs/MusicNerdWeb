// @ts-nocheck
import { jest } from '@jest/globals';

const mockTrackServerEvent = jest.fn(async () => undefined);
jest.mock('@/server/utils/analytics/trackServerEvent', () => ({ trackServerEvent: (...a) => mockTrackServerEvent(...a) }));
jest.mock('@/server/utils/queries/artistQueries', () => ({ getArtistById: jest.fn() }));
jest.mock('@/server/utils/queries/dashboardQueries', () => ({ getVaultSourcesByArtistId: jest.fn().mockResolvedValue([]) }));
jest.mock('@/server/utils/artistDocService', () => ({ getArtistDocContext: jest.fn() }));
jest.mock('@/server/lib/ai/generateText', () => ({ generateText: jest.fn() }));
// Follow-up chips are a separate call; rejecting it takes the static fallback, as an unparseable reply did.
jest.mock('@/server/lib/ai/generateArray', () => ({ generateArray: jest.fn().mockRejectedValue(new Error('no follow-ups in this test')) }));

if (!('json' in Response)) {
    Response.json = (data, init) =>
        new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
            status: init?.status || 200,
        });
}

describe('POST /api/askArtist injects the artist doc', () => {
    beforeEach(() => { jest.resetModules(); jest.clearAllMocks(); });

    it('adds the ARTIST DOC block to the system instruction when a doc exists', async () => {
        const { getArtistById } = await import('@/server/utils/queries/artistQueries');
        const { getArtistDocContext } = await import('@/server/utils/artistDocService');
        const { generateText } = await import('@/server/lib/ai/generateText');
        const generateContent = jest.fn().mockResolvedValue({ text: 'answer' });
        generateText.mockImplementation(generateContent);
        getArtistById.mockResolvedValue({ id: 'a1', name: 'Nova Reyes' });
        getArtistDocContext.mockResolvedValue('## Story hooks\n- records in a water tower');

        const { POST } = await import('../route');
        const res = await POST(new Request('http://x/api/askArtist', {
            method: 'POST',
            body: JSON.stringify({ artistId: 'a1', question: 'What is her studio like?' }),
        }));

        expect(res.status).toBe(200);
        const sys = generateContent.mock.calls[0][0].instructions;
        expect(sys).toContain('--- ARTIST DOC');
        expect(sys).toContain('water tower');
        expect(sys).toContain('not independent evidence');
        expect(sys).not.toContain('compiled with the artist; treat as ground truth');
    });

    it('reports an error outcome when the model call fails', async () => {
        const { getArtistById } = await import('@/server/utils/queries/artistQueries');
        const { getArtistDocContext } = await import('@/server/utils/artistDocService');
        const { generateText } = await import('@/server/lib/ai/generateText');
        generateText.mockRejectedValue(new Error('boom'));
        getArtistById.mockResolvedValue({ id: 'a1', name: 'Nova Reyes' });
        getArtistDocContext.mockResolvedValue(null);

        const { POST } = await import('../route');
        const res = await POST(new Request('http://x/api/askArtist', {
            method: 'POST',
            body: JSON.stringify({ artistId: 'a1', question: 'Anything?' }),
        }));

        expect(res.status).toBe(500);
        expect(mockTrackServerEvent).toHaveBeenCalledWith('ask_question', { outcome: 'error', sources: 0 });
    });

    it('still answers when doc lookup throws', async () => {
        const { getArtistById } = await import('@/server/utils/queries/artistQueries');
        const { getArtistDocContext } = await import('@/server/utils/artistDocService');
        const { generateText } = await import('@/server/lib/ai/generateText');
        generateText.mockResolvedValue({ text: 'answer' });
        getArtistById.mockResolvedValue({ id: 'a1', name: 'Nova Reyes' });
        getArtistDocContext.mockRejectedValue(new Error('boom'));

        const { POST } = await import('../route');
        const res = await POST(new Request('http://x/api/askArtist', {
            method: 'POST',
            body: JSON.stringify({ artistId: 'a1', question: 'hello?' }),
        }));
        expect(res.status).toBe(200);
    });
});
