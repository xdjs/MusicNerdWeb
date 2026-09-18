import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth-helpers';
import { addUserBookmarks, editUserBookmarks, getUserBookmarks, removeUserBookmark } from '@/server/utils/queries/bookmarkQueries';

export const dynamic = 'force-dynamic';
const CACHE_HEADERS = { 'Cache-Control': 'private, no-store', Vary: 'Cookie, X-Bookmark-Account' };
const uuid = z.string().uuid().transform((value) => value.toLowerCase());
const ids = z.array(uuid).max(500);
const addBody = z.object({ artistIds: ids, import: z.boolean().optional() }).strict();
const removeBody = z.object({ artistId: uuid }).strict();
const editBody = z.object({ orderedArtistIds: ids, removedArtistIds: ids }).strict();

function json(body: unknown, status = 200) {
    return Response.json(body, { status, headers: CACHE_HEADERS });
}

async function authenticatedUser(request: NextRequest, mutation: boolean): Promise<string | Response> {
    const auth = await requireAuth();
    if (!auth.authenticated) {
        auth.response.headers.set('Cache-Control', CACHE_HEADERS['Cache-Control']);
        auth.response.headers.set('Vary', CACHE_HEADERS.Vary);
        return auth.response;
    }
    const userId = auth.session.user.id;
    const expectedAccount = request.headers.get('X-Bookmark-Account');
    if ((mutation && !expectedAccount) || (expectedAccount && expectedAccount !== userId)) {
        return json({ error: 'Account changed. Refresh before updating bookmarks.' }, 409);
    }
    if (mutation) {
        const origin = request.headers.get('Origin');
        if (origin && origin !== new URL(request.url).origin) return json({ error: 'Forbidden origin' }, 403);
    }
    if ([...new URL(request.url).searchParams].length) return json({ error: 'Unexpected query parameters' }, 400);
    return userId;
}

export async function GET(request: NextRequest) {
    try {
        const userId = await authenticatedUser(request, false);
        if (userId instanceof Response) return userId;
        return json({ userId, bookmarks: await getUserBookmarks(userId) });
    } catch {
        return json({ error: 'Could not load bookmarks. Please try again.' }, 500);
    }
}

async function mutate(request: NextRequest, method: 'POST' | 'PATCH' | 'DELETE') {
    try {
        const userId = await authenticatedUser(request, true);
        if (userId instanceof Response) return userId;
        let body: unknown;
        try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }
        const schema = method === 'POST' ? addBody : method === 'DELETE' ? removeBody : editBody;
        if (!schema.safeParse(body).success) return json({ error: 'Invalid bookmark request' }, 400);
        const bookmarks = method === 'POST'
            ? await addUserBookmarks(userId, addBody.parse(body).artistIds, addBody.parse(body).import ?? false)
            : method === 'DELETE'
                ? await removeUserBookmark(userId, removeBody.parse(body).artistId)
                : await editUserBookmarks(userId, editBody.parse(body).orderedArtistIds, editBody.parse(body).removedArtistIds);
        return json({ userId, bookmarks });
    } catch {
        return json({ error: 'Could not save bookmarks. Please try again.' }, 500);
    }
}

export async function POST(request: NextRequest) { return mutate(request, 'POST'); }
export async function PATCH(request: NextRequest) { return mutate(request, 'PATCH'); }
export async function DELETE(request: NextRequest) { return mutate(request, 'DELETE'); }
