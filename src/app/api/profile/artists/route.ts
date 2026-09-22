import { normalizeStoredArtistImage } from '@/lib/artist/normalizeStoredArtistImage';
import { requireAuth } from '@/lib/auth-helpers';
import { getContributedArtists } from '@/server/utils/profile/getContributedArtists';

export const dynamic = 'force-dynamic';
const PAGE_SIZE = 24;

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (!auth.authenticated) return auth.response;
  if (request.headers.get('X-Profile-Account') !== auth.userId) return Response.json({error: 'Account changed. Refresh and try again.'}, {status: 409});
  const params = new URL(request.url).searchParams;
  const rawOffset = params.get('offset') ?? '0';
  const query = (params.get('q') ?? '').trim();
  if (!/^\d{1,6}$/.test(rawOffset) || query.length > 200) return Response.json({error: 'Invalid artist search'}, {status: 400});
  const offset = Number(rawOffset);
  try {
    const result = await getContributedArtists(auth.userId, {offset, limit: PAGE_SIZE, query});
    const next = offset + result.artists.length;
    return Response.json({userId: auth.userId, artists: result.artists.map(artist => ({artistId: artist.id, artistName: artist.name || 'Unknown artist', imageUrl: normalizeStoredArtistImage(artist.customImage)})), total: result.total, next: next < result.total ? next : null}, {headers: {'Cache-Control': 'private, no-store'}});
  } catch { return Response.json({error: 'Could not load your artists'}, {status: 503}); }
}
