import { getSharePublicBio } from '@/server/utils/artistShare/getSharePublicBio';
import { getArtistById } from '@/server/utils/queries/artistQueries';
import { musicPlatformData } from '@/server/utils/musicPlatform';
import { loadSharePortrait } from '@/server/utils/artistShare/loadSharePortrait';
import { renderArtistShareImage } from '@/server/utils/artistShare/renderArtistShareImage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        return new Response('Artist not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
    }
    try {
        const artist = await getArtistById(id);
        if (!artist) return new Response('Artist not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
        let bioLookupFailed = false;
        const publicBio = await getSharePublicBio(artist).catch(() => { bioLookupFailed = true; return null; });
        const portraitUrl = await musicPlatformData.getArtistPortrait(artist).catch(() => null);
        const portrait = await loadSharePortrait(portraitUrl, id);
        // Finish rendering before returning so a failed render cannot stream a broken card.
        let bytes: ArrayBuffer;
        try {
            bytes = await renderArtistShareImage(artist.name ?? 'Unknown Artist', portrait, publicBio).arrayBuffer();
        } catch {
            bytes = await renderArtistShareImage('Discover this artist', null).arrayBuffer();
        }
        return new Response(bytes, { headers: {
            'Content-Type': 'image/png',
            'Cache-Control': bioLookupFailed ? 'no-store' : 'public, max-age=3600, s-maxage=3600',
            'X-Content-Type-Options': 'nosniff',
        } });
    } catch {
        return new Response('Preview temporarily unavailable', { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
}
