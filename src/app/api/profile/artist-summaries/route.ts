import { requireAuth } from '@/lib/auth-helpers';
import { db } from '@/server/db/drizzle';
import { artists } from '@/server/db/schema';
import { inArray, sql } from 'drizzle-orm';
import { isRealBio } from '@/lib/bio/bioConstants';

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (!auth.authenticated) return auth.response;
  const ids = [...new Set(new URL(request.url).searchParams.getAll('id'))];
  if (!ids.length || ids.length > 6 || ids.some(id => !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id))) {
    return Response.json({ error: 'Provide up to six artist IDs' }, { status: 400 });
  }
  const rows = await db.select({ id: artists.id, bio: sql<string | null>`case when exists(select 1 from artist_claims c where c.artist_id=${artists.id} and c.status='approved') then ${artists.bio} else null end` }).from(artists).where(inArray(artists.id, ids));
  return Response.json(rows.map(row => ({ id: row.id, bio: row.bio && isRealBio(row.bio) ? row.bio : null })), { headers: { 'Cache-Control': 'private, no-store' } });
}
