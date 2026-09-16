import {eq} from 'drizzle-orm';
import {db} from '@/server/db/drizzle';
import {artists} from '@/server/db/schema';
import {customImageUrl} from '@/lib/artist/artistImage';
import {musicPlatformData} from '@/server/utils/musicPlatform';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/** Public artist imagery loads separately from private profile/account data. */
export async function GET(request: Request, {params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  const unavailable = (status: number) => new Response(null, {status, headers: {'Cache-Control': 'no-store'}});
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return unavailable(400);
  try {
    const artist = await db.query.artists.findFirst({where: eq(artists.id, id)});
    if (!artist) return unavailable(404);
    const value = customImageUrl(artist.customImage) ?? await musicPlatformData.getArtistImage(artist);
    if (!value) return unavailable(404);
    const url = new URL(value, request.url);
    if (url.protocol !== 'https:' || url.username || url.password) return unavailable(404);
    return new Response(null, {status: 307, headers: {Location: url.toString(), 'Cache-Control': 'public, max-age=3600'}});
  } catch {
    return unavailable(503);
  }
}
