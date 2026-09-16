// @ts-nocheck
import { jest } from '@jest/globals';

jest.mock('@/lib/auth-helpers', () => ({ requireAuth: jest.fn() }));
jest.mock('@/server/utils/queries/bookmarkQueries', () => ({
    getUserBookmarks: jest.fn(), addUserBookmarks: jest.fn(), editUserBookmarks: jest.fn(), removeUserBookmark: jest.fn(),
}));

if (!('json' in Response)) {
    Response.json = (data, init) => new Response(JSON.stringify(data), {
        ...init, headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
}

const USER = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const ARTIST = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const bookmarks = [{ artistId: ARTIST, artistName: 'Artist', imageUrl: null }];

function request(body: unknown = undefined, headers: Record<string, string> = { 'X-Bookmark-Account': USER }, url = 'https://musicnerd.test/api/bookmarks') {
    return { url, headers: new Headers(headers), json: jest.fn().mockResolvedValue(body) };
}

async function setup() {
    const { requireAuth } = await import('@/lib/auth-helpers');
    const { getUserBookmarks, addUserBookmarks, editUserBookmarks, removeUserBookmark } = await import('@/server/utils/queries/bookmarkQueries');
    const queries = { getUserBookmarks, addUserBookmarks, editUserBookmarks, removeUserBookmark };
    const route = await import('../route');
    requireAuth.mockResolvedValue({ authenticated: true, session: { user: { id: USER } }, userId: USER });
    for (const query of Object.values(queries)) query.mockResolvedValue(bookmarks);
    return { ...route, queries, requireAuth };
}

describe('/api/bookmarks', () => {
    beforeEach(() => { jest.resetModules(); jest.clearAllMocks(); });

    it.each(['GET', 'POST', 'PATCH', 'DELETE'])('requires a real authenticated session for %s', async (method) => {
        const api = await setup();
        api.requireAuth.mockResolvedValue({ authenticated: false, response: Response.json({ error: 'Not authenticated' }, { status: 401 }) });
        const response = await api[method](request({ artistIds: [ARTIST] }));
        expect(response.status).toBe(401);
        expect(response.headers.get('Cache-Control')).toBe('private, no-store');
        for (const query of Object.values(api.queries)) expect(query).not.toHaveBeenCalled();
    });

    it('returns only the session owner and a private no-store payload', async () => {
        const { GET, queries } = await setup();
        const response = await GET(request());
        expect(await response.json()).toEqual({ userId: USER, bookmarks });
        expect(queries.getUserBookmarks).toHaveBeenCalledWith(USER);
        expect(response.headers.get('Cache-Control')).toBe('private, no-store');
        expect(response.headers.get('Vary')).toContain('Cookie');
    });

    it.each(['GET', 'POST', 'PATCH', 'DELETE'])('rejects an account assertion from another user for %s', async (method) => {
        const api = await setup();
        const response = await api[method](request({ artistIds: [ARTIST] }, { 'X-Bookmark-Account': OTHER }));
        expect(response.status).toBe(409);
        for (const query of Object.values(api.queries)) expect(query).not.toHaveBeenCalled();
    });

    it.each(['POST', 'PATCH', 'DELETE'])('requires an account assertion on %s', async (method) => {
        const api = await setup();
        expect((await api[method](request({}, {}))).status).toBe(409);
    });

    it('does not accept a user id or other unrecognized data in the mutation body', async () => {
        const { POST, queries } = await setup();
        expect((await POST(request({ artistIds: [ARTIST], userId: OTHER }))).status).toBe(400);
        expect((await POST(request({ artistIds: [ARTIST], imageUrl: 'https://evil.test/photo' }))).status).toBe(400);
        expect(queries.addUserBookmarks).not.toHaveBeenCalled();
    });

    it('does not accept ownership in query parameters', async () => {
        const { GET, queries } = await setup();
        expect((await GET(request(undefined, {}, `https://musicnerd.test/api/bookmarks?userId=${OTHER}`))).status).toBe(400);
        expect(queries.getUserBookmarks).not.toHaveBeenCalled();
    });

    it('validates UUID arrays, count limits, object shape and malformed JSON', async () => {
        const { POST, PATCH, DELETE, queries } = await setup();
        for (const body of [null, [], { artistIds: ['bad'] }, { artistIds: Array(501).fill(ARTIST) }]) {
            expect((await POST(request(body))).status).toBe(400);
        }
        expect((await PATCH(request({ orderedArtistIds: [ARTIST] }))).status).toBe(400);
        expect((await DELETE(request({ artistId: 'nope' }))).status).toBe(400);
        const broken = request();
        broken.json.mockRejectedValue(new SyntaxError('bad JSON'));
        expect((await POST(broken)).status).toBe(400);
        for (const query of Object.values(queries)) expect(query).not.toHaveBeenCalled();
    });

    it.each(['POST', 'PATCH', 'DELETE'])('rejects cross-origin writes for %s', async (method) => {
        const api = await setup();
        expect((await api[method](request({}, { 'X-Bookmark-Account': USER, Origin: 'https://evil.test' }))).status).toBe(403);
        for (const query of Object.values(api.queries)) expect(query).not.toHaveBeenCalled();
    });

    it('adds normalized IDs using only session ownership and returns the persisted list', async () => {
        const { POST, queries } = await setup();
        const response = await POST(request({ artistIds: [ARTIST.toUpperCase()] }, { 'X-Bookmark-Account': USER, Origin: 'https://musicnerd.test' }));
        expect(await response.json()).toEqual({ userId: USER, bookmarks });
        expect(queries.addUserBookmarks).toHaveBeenCalledWith(USER, [ARTIST], false);
    });

    it('passes explicit removals/reorder without replacing the account list', async () => {
        const { PATCH, DELETE, queries } = await setup();
        expect((await PATCH(request({ orderedArtistIds: [ARTIST], removedArtistIds: [] }))).status).toBe(200);
        expect(queries.editUserBookmarks).toHaveBeenCalledWith(USER, [ARTIST], []);
        expect((await DELETE(request({ artistId: ARTIST }))).status).toBe(200);
        expect(queries.removeUserBookmark).toHaveBeenCalledWith(USER, ARTIST);
    });

    it('reports persistence failure without exposing database details or pretending success', async () => {
        const { POST, queries } = await setup();
        queries.addUserBookmarks.mockRejectedValue(new Error('private connection error'));
        const response = await POST(request({ artistIds: [ARTIST] }));
        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ error: 'Could not save bookmarks. Please try again.' });
    });
});
