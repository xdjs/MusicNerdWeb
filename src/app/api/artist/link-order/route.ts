import { z } from 'zod';
import { requireAuth } from '@/lib/auth-helpers';
import { canEditArtist } from '@/server/utils/artistEditAuth';
import { getAllLinks } from '@/server/utils/queries/artistQueries';
import { saveArtistLinkOrder } from '@/server/utils/queries/artistLinkOrder';
import { getLoreClaimGeneration } from '@/server/utils/queries/lorePersistence';
import { withArtistOperation } from '@/server/utils/artistOperationContext';
import { OwnershipChangedError } from '@/server/utils/queries/ownershipWrites';

export const dynamic = 'force-dynamic';
const input = z.object({
    artistId: z.string().uuid(),
    section: z.enum(['links', 'support']),
    order: z.array(z.string().min(1).max(80)).max(100).refine(names => new Set(names).size === names.length),
});

export async function PUT(req: Request) {
    try {
        const auth = await requireAuth();
        if (!auth.authenticated) return auth.response;
        const parsed = input.safeParse(await req.json().catch(() => null));
        if (!parsed.success) return Response.json({ error: 'Invalid link order' }, { status: 400 });
        const { artistId, section, order } = parsed.data;
        const expectedClaimId = await getLoreClaimGeneration(artistId);
        if (!await canEditArtist(auth.userId, artistId)) return Response.json({ error: 'Not authorized for this artist' }, { status: 403 });
        const known = new Set(['spotify', 'deezer', ...(await getAllLinks()).map(link => link.siteName)]);
        if (order.some(name => !known.has(name))) return Response.json({ error: 'Unknown platform' }, { status: 400 });
        const saved = await withArtistOperation(artistId, { userId: auth.userId, expectedClaimId }, () => saveArtistLinkOrder(artistId, section, order));
        if (!saved) return Response.json({ error: 'Artist not found' }, { status: 404 });
        return Response.json({ success: true });
    } catch (error) {
        if (error instanceof OwnershipChangedError) return Response.json({ error: error.message }, { status: 403 });
        console.error('[artist/link-order] Save failed', error);
        return Response.json({ error: 'Could not save link order' }, { status: 500 });
    }
}
