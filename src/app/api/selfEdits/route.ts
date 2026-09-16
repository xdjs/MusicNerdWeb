import { requireAuth } from '@/lib/auth-helpers';
import { getArtistSelfEdits } from '@/server/utils/queries/getArtistSelfEdits';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const auth = await requireAuth();
    if (!auth.authenticated) return auth.response;
    const rawPage = new URL(request.url).searchParams.get('page') ?? '1';
    const page = Number(rawPage);
    if (!Number.isSafeInteger(page) || page < 1) {
        return Response.json({ error: 'Invalid page' }, { status: 400 });
    }
    try {
        return Response.json(await getArtistSelfEdits(auth.userId, page), {
            headers: { 'Cache-Control': 'private, no-store' },
        });
    } catch (error) {
        console.error('[selfEdits] Unable to load history', error);
        return Response.json({ error: 'Unable to load profile edits' }, { status: 500 });
    }
}
