import { trackServerEvent } from '@/server/utils/analytics/trackServerEvent';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/server/db/drizzle';
import { artists } from '@/server/db/schema';
import { getServerAuthSession } from '@/server/auth';
import { getDevSession } from '@/server/utils/dev-auth';
import { canEditArtist } from '@/server/utils/artistEditAuth';
import { getProviderPhoto } from '@/server/utils/musicPlatform/getProviderPhoto';
import { withArtistOperation } from '@/server/utils/artistOperationContext';
import { getLoreClaimGeneration } from '@/server/utils/queries/lorePersistence';
import { withScopedArtistWrite, OwnershipChangedError } from '@/server/utils/queries/ownershipWrites';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;
const payload = z.object({
    artistId: z.string().uuid(),
    source: z.enum(['deezer', 'spotify']),
    imageUrl: z.string().url().max(4096),
    expectedCustomImage: z.string().max(4096).nullable(),
    providerId: z.string().min(1).max(255),
}).strict();
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

export async function GET(req: Request) {
    const session = await getServerAuthSession() ?? await getDevSession();
    if (!session) return json({ error: 'Not authenticated' }, 401);
    const parsed = z.string().uuid().safeParse(new URL(req.url).searchParams.get('artistId'));
    if (!parsed.success) return json({ error: 'Invalid artist' }, 400);
    const artistId = parsed.data;
    try {
        if (!(await canEditArtist(session.user.id, artistId))) return json({ error: 'Not authorized for this artist' }, 403);
        const artist = await db.query.artists.findFirst({ where: eq(artists.id, artistId) });
        if (!artist) return json({ error: 'Artist not found' }, 404);
        const options = await Promise.all((['deezer', 'spotify'] as const).map(async source => ({
            source, providerId: artist[source]?.trim() || null,
            imageUrl: await getProviderPhoto(artist, source),
        })));
        return json({ expectedCustomImage: artist.customImage, options });
    } catch { return json({ error: 'Could not load photo choices' }, 503); }
}

export async function PATCH(req: Request) {
    const session = await getServerAuthSession() ?? await getDevSession();
    if (!session) return json({ error: 'Not authenticated' }, 401);
    const parsed = payload.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: 'Invalid photo choice' }, 400);
    const { artistId, source, imageUrl, expectedCustomImage, providerId } = parsed.data;
    try {
        const expectedClaimId = await getLoreClaimGeneration(artistId);
        if (!(await canEditArtist(session.user.id, artistId))) return json({ error: 'Not authorized for this artist' }, 403);
        const artist = await db.query.artists.findFirst({ where: eq(artists.id, artistId) });
        if (!artist) return json({ error: 'Artist not found' }, 404);
        if (artist.customImage !== expectedCustomImage || artist[source]?.trim() !== providerId) {
            return json({ error: 'The profile changed. Close and reopen photo choices.' }, 409);
        }
        const resolved = await getProviderPhoto(artist, source);
        if (!resolved) return json({ error: 'That photo is unavailable. Your current photo is unchanged.' }, 503);
        if (resolved !== imageUrl) return json({ error: 'That provider photo changed. Close and reopen photo choices.' }, 409);
        const updated = await withArtistOperation(artistId, { userId: session.user.id, expectedClaimId },
            () => withScopedArtistWrite(artistId, tx => tx.update(artists)
                .set({ customImage: resolved,
                    headerImagePosition: sql`CASE WHEN ${artists.headerImagePosition}->>'imageUrl' = ${resolved} THEN ${artists.headerImagePosition} ELSE NULL END`,
                })
                .where(and(eq(artists.id, artistId),
                    sql`${artists.customImage} IS NOT DISTINCT FROM ${expectedCustomImage}`,
                    sql`btrim(${artists[source]}) = ${providerId}`))
                .returning({ imagePath: artists.customImage, position: artists.headerImagePosition })),
        );
        if (!updated.length) return json({ error: 'The profile changed. Close and reopen photo choices.' }, 409);
        await trackServerEvent('profile_edit', { action: 'photo', target: null });
        return json({ success: true, imagePath: updated[0]!.imagePath, position: updated[0]!.position?.y ?? 0 });
    } catch (error) {
        if (error instanceof OwnershipChangedError) return json({ error: 'Artist ownership changed' }, 403);
        return json({ error: 'Could not save photo. Your current photo is unchanged.' }, 500);
    }
}
