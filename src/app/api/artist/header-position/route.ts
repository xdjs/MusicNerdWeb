import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getServerAuthSession } from '@/server/auth';
import { getDevSession } from '@/server/utils/dev-auth';
import { canEditArtist } from '@/server/utils/artistEditAuth';
import { db } from '@/server/db/drizzle';
import { artists } from '@/server/db/schema';

const payload = z.object({
    artistId: z.string().uuid(),
    imageUrl: z.string().max(4096).refine(value => {
        if (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')) return true;
        try {
            const url = new URL(value);
            return url.protocol === 'https:' && !url.username && !url.password;
        } catch { return false; }
    }),
    y: z.number().int().min(0).max(100),
}).strict();

export async function PATCH(req: Request) {
    const session = await getServerAuthSession() ?? await getDevSession();
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const parsed = payload.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid photo position' }, { status: 400 });
    const { artistId, imageUrl, y } = parsed.data;
    try {
        if (!(await canEditArtist(session.user.id, artistId))) {
            return NextResponse.json({ error: 'Not authorized for this artist' }, { status: 403 });
        }
        const updated = await db.update(artists).set({ headerImagePosition: { imageUrl, y } })
            .where(eq(artists.id, artistId)).returning({ id: artists.id });
        if (!updated.length) return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Could not save photo position' }, { status: 500 });
    }
}
