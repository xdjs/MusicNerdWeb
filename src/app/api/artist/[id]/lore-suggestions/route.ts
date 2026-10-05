import { isIP } from 'node:net';
import { requireAuth } from '@/lib/auth-helpers';
import { canonicalizeLoreUrl } from '@/lib/source/canonicalizeLoreUrl';
import { inferTypeFromUrl } from '@/lib/source/sourceTypes';
import { isUnsafeUrl } from '@/server/utils/fetchPageContent';
import { insertVaultSource } from '@/server/utils/queries/dashboardQueries';
import { getVaultSourceUrlsByArtistId } from '@/server/utils/queries/getVaultSourceUrlsByArtistId';
import { getUserById } from '@/server/utils/queries/userQueries';
import { getLoreClaimGeneration } from '@/server/utils/queries/lorePersistence';
import { queueLoreRefresh } from '@/server/utils/queries/loreRefresh';

export const dynamic = 'force-dynamic';

/** Trusted contributors publish immediately; other visitors submit for review. */
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
        // Read the current role: neither session flags nor client input authorize approval.
        const user = await getUserById(auth.userId);
        const autoApprove = !!(user?.isAdmin || user?.isWhiteListed);
        const claimId = autoApprove ? await getLoreClaimGeneration(artistId) : null;
        const title = `Source from ${new URL(url).hostname.replace(/^www\./, '')}`;
        const source = await insertVaultSource({
            artistId, url, title, type: inferTypeFromUrl(url), status: autoApprove ? 'approved' : 'pending',
        }, undefined, { userId: auth.userId, trigger: autoApprove ? 'trusted_submission' : 'visitor_suggestion' });
        if (!source) {
            return Response.json({ error: 'This source has already been suggested' }, { status: 409 });
        }
        let warning: string | undefined;
        if (source.status === 'approved') {
            try { await queueLoreRefresh(artistId, claimId, { userId: auth.userId, trigger: 'source_submission' }); }
            catch (error) {
                console.error('[lore-suggestions] Source saved; Lore enqueue failed', error);
                warning = 'Source saved and approved, but the Lore refresh could not start. An artist or admin can retry it. You do not need to submit again.';
            }
        }
        return Response.json({ success: true, status: source.status, warning }, { status: 201 });
    } catch (error) {
        console.error('[lore-suggestions] Could not save source', error);
        return Response.json({ error: 'Could not submit the source. Please try again.' }, { status: 500 });
    }
}
