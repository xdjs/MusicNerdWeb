import { isIP } from 'node:net';
import { requireAuth } from '@/lib/auth-helpers';
import { canonicalizeLoreUrl } from '@/lib/source/canonicalizeLoreUrl';
import { inferTypeFromUrl } from '@/lib/source/sourceTypes';
import { isUnsafeUrl } from '@/server/utils/fetchPageContent';
import { insertVaultSource } from '@/server/utils/queries/dashboardQueries';
import { getVaultSourceUrlsByArtistId } from '@/server/utils/queries/getVaultSourceUrlsByArtistId';

export const dynamic = 'force-dynamic';

/** Save a visitor's URL for the claimed artist (or an admin) to review. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth();
    if (!auth.authenticated) return auth.response;

    const { id: artistId } = await params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(artistId)) {
        return Response.json({ error: 'Invalid artist ID' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const url = typeof body?.url === 'string' ? canonicalizeLoreUrl(body.url) : null;
    if (!url || isIP(new URL(url).hostname) !== 0 || isUnsafeUrl(url) || url.length > 2048) {
        return Response.json({ error: 'Enter a public website URL' }, { status: 400 });
    }

    try {
        // Older editor submissions could retain fragments. Check their
        // canonical forms before relying on the raw-URL unique index.
        const existing = await getVaultSourceUrlsByArtistId(artistId);
        if (existing.some(sourceUrl => canonicalizeLoreUrl(sourceUrl) === url)) {
            return Response.json({ error: 'This source has already been suggested' }, { status: 409 });
        }
        const title = `Source from ${new URL(url).hostname.replace(/^www\./, '')}`;
        const source = await insertVaultSource({
            artistId, url, title, type: inferTypeFromUrl(url), status: 'pending',
        });
        if (!source) {
            return Response.json({ error: 'This source has already been suggested' }, { status: 409 });
        }
        return Response.json({ success: true, message: 'Submitted for artist review.' }, { status: 201 });
    } catch (error) {
        console.error('[lore-suggestions] Could not save source', error);
        return Response.json({ error: 'Could not submit the source. Please try again.' }, { status: 500 });
    }
}
