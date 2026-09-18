import { latestDateSortTime } from '@/lib/artist/artistLatest';
import { requireAuth } from '@/lib/auth-helpers';
import { db } from '@/server/db/drizzle';
import { artists, userArtistBookmarks } from '@/server/db/schema';
import { and, asc, eq, isNull, count } from 'drizzle-orm';
import { getArtistLatest } from '@/server/utils/queries/artistLatestQueries';
import type { ProfileUpdate } from '@/lib/profile/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const BATCH = 6;

/** Artist-window pagination bounds catalog fanout; UI reports partial coverage. */
export async function GET(request: Request) {
  const auth = await requireAuth();
  if (!auth.authenticated) return auth.response;
  if (request.headers.get('X-Profile-Account') !== auth.userId) return Response.json({error: 'Account changed. Refresh and try again.'}, {status: 409});
  const rawOffset = new URL(request.url).searchParams.get('offset') ?? '0';
  if (!/^\d{1,6}$/.test(rawOffset)) return Response.json({error: 'Invalid offset'}, {status: 400});
  const offset = Number(rawOffset);
  const filter = new URL(request.url).searchParams.get('kind') ?? 'All';
  const kinds: Record<string, string> = {Release: 'release', Instagram: 'instagram', Interview: 'interview', 'In-Process': 'moment'};
  if (filter !== 'All' && !kinds[filter]) return Response.json({error: 'Invalid filter'}, {status: 400});
  try {
    const owned = and(eq(userArtistBookmarks.userId, auth.userId), isNull(userArtistBookmarks.removedAt));
    const [rows, totals] = await Promise.all([
      db.select({artist: artists}).from(userArtistBookmarks).innerJoin(artists, eq(userArtistBookmarks.artistId, artists.id)).where(owned).orderBy(asc(userArtistBookmarks.position), asc(userArtistBookmarks.createdAt), asc(userArtistBookmarks.artistId)).limit(BATCH).offset(offset),
      db.select({total: count()}).from(userArtistBookmarks).where(owned),
    ]);
    const items: ProfileUpdate[] = [];
    let unavailable = false;
    // Two artists at a time, with existing provider request budgets/timeouts.
    for (let index = 0; index < rows.length; index += 2) {
      await Promise.all(rows.slice(index, index + 2).map(async ({artist}) => {
        try {
          const latest = await getArtistLatest(artist);
          unavailable ||= latest.unavailable;
          items.push(...latest.items.filter(item => filter === 'All' || item.kind === kinds[filter]).slice(0, 2).map(item => ({...item, id: `${artist.id}:${item.id}`, artistId: artist.id, artistName: artist.name || 'Unknown artist'})));
        } catch { unavailable = true; }
      }));
    }
    const checked = offset + rows.length;
    return Response.json({userId: auth.userId, items: items.sort((a,b) => latestDateSortTime(b.date) - latestDateSortTime(a.date) || a.id.localeCompare(b.id)), checked, next: checked < (totals[0]?.total ?? 0) ? checked : null, unavailable}, {headers: {'Cache-Control': 'private, no-store'}});
  } catch { return Response.json({error: 'Could not load artist updates'}, {status: 503}); }
}
