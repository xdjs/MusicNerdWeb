import { PROFILE_UPDATE_KINDS } from '@/lib/profile/profileUpdateFilters';
import { matchesProfileUpdateFilter } from '@/lib/profile/matchesProfileUpdateFilter';
import { latestDateSortTime } from '@/lib/artist/artistLatest';
import { requireAuth } from '@/lib/auth-helpers';
import { getContributedArtists } from '@/server/utils/profile/getContributedArtists';
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
  if (!Object.hasOwn(PROFILE_UPDATE_KINDS, filter)) return Response.json({error: 'Invalid filter'}, {status: 400});
  try {
    const {artists: rows, total} = await getContributedArtists(auth.userId, {offset, limit: BATCH});
    const items: ProfileUpdate[] = [];
    let unavailable = false;
    // Two artists at a time, with existing provider request budgets/timeouts.
    for (let index = 0; index < rows.length; index += 2) {
      await Promise.all(rows.slice(index, index + 2).map(async artist => {
        try {
          const latest = await getArtistLatest(artist);
          unavailable ||= latest.unavailable;
          items.push(...latest.items.filter(item => matchesProfileUpdateFilter(item.kind, filter)).slice(0, 2).map(item => ({...item, id: `${artist.id}:${item.id}`, artistId: artist.id, artistName: artist.name || 'Unknown artist'})));
        } catch { unavailable = true; }
      }));
    }
    const checked = offset + rows.length;
    return Response.json({userId: auth.userId, items: items.sort((a,b) => latestDateSortTime(b.date) - latestDateSortTime(a.date) || a.id.localeCompare(b.id)), checked, next: checked < total ? checked : null, unavailable}, {headers: {'Cache-Control': 'private, no-store'}});
  } catch { return Response.json({error: 'Could not load artist updates'}, {status: 503}); }
}
