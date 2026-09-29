import { and, count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '@/server/db/drizzle';
import { artistActivityEvents as events, artists, users } from '@/server/db/schema';

/** Private bounded projection; the Admin page authorizes before calling. */
export async function getArtistActivity({ page = 1, query = '', action = '', eventId = '' }: {
  page?: number; query?: string; action?: string; eventId?: string;
} = {}) {
  const pageSize = 25;
  const search = query.trim().slice(0, 100);
  const pattern = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
  const selectedId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId) ? eventId : '';
  const where = and(selectedId ? eq(events.id, selectedId) : undefined,
    action ? eq(events.action, action.slice(0, 60)) : undefined,
    search ? or(ilike(artists.name, pattern), ilike(users.username, pattern), ilike(users.email, pattern), sql`${users.id}::text ilike ${pattern}`) : undefined);
  const [counts] = await db.select({ total: count() }).from(events)
    .innerJoin(artists, eq(events.artistId, artists.id)).leftJoin(users, eq(events.actorUserId, users.id)).where(where);
  const total = counts?.total ?? 0;
  const currentPage = Math.min(Number.isSafeInteger(page) && page > 0 ? page : 1, Math.max(1, Math.ceil(total / pageSize)));
  const items = await db.select({
    id: events.id, artistId: events.artistId, artistName: artists.name, action: events.action,
    trigger: events.trigger, actorKind: events.actorKind, actorId: users.id, actorName: users.username,
    actorEmail: users.email, createdAt: events.createdAt, sourceId: events.sourceId,
  }).from(events).innerJoin(artists, eq(events.artistId, artists.id)).leftJoin(users, eq(events.actorUserId, users.id))
    .where(where).orderBy(desc(events.createdAt), desc(events.id)).limit(pageSize).offset((currentPage - 1) * pageSize);
  return { items, total, page: currentPage, pageSize, query: search, action, eventId: selectedId };
}
