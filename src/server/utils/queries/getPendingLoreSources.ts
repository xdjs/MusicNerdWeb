import { and, count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '@/server/db/drizzle';
import { artists, artistVaultSources, artistActivityEvents, users } from '@/server/db/schema';

/** Bounded Admin-only projection. Caller must check the live admin role first. */
export async function getPendingLoreSources({ page = 1, query = '', origin = '', claim = '' }: {
  page?: number; query?: string; origin?: string; claim?: string;
} = {}) {
  const pageSize = 25;
  const requestedPage = Number.isSafeInteger(page) && page > 0 ? page : 1;
  const search = query.trim().slice(0, 100);
  const selectedOrigin = ['submission', 'upload', 'research', 'unknown'].includes(origin) ? origin : '';
  const selectedClaim = ['claimed', 'unclaimed'].includes(claim) ? claim : '';
  const pattern = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
  const pending = eq(artistVaultSources.status, 'pending');
  const claimed = sql<boolean>`exists (select 1 from artist_claims c where c.artist_id = ${artists.id} and c.status = 'approved')`;
  const where = and(pending,
    selectedOrigin ? eq(artistVaultSources.origin, selectedOrigin) : undefined,
    selectedClaim ? sql`${claimed} = ${selectedClaim === 'claimed'}` : undefined,
    search ? or(ilike(artists.name, pattern), ilike(artistVaultSources.title, pattern), ilike(artistVaultSources.url, pattern),
      ilike(users.username, pattern), ilike(users.email, pattern), sql`${users.id}::text ilike ${pattern}`) : undefined);
  const [pendingCounts, matchCounts] = await Promise.all([
    db.select({ total: count() }).from(artistVaultSources).where(pending),
    db.select({ total: count() }).from(artistVaultSources)
      .innerJoin(artists, eq(artistVaultSources.artistId, artists.id))
      .leftJoin(artistActivityEvents, eq(artistVaultSources.activityId, artistActivityEvents.id))
      .leftJoin(users, eq(artistActivityEvents.actorUserId, users.id)).where(where),
  ]);
  const pendingTotal = pendingCounts[0]?.total ?? 0;
  const total = matchCounts[0]?.total ?? 0;
  const currentPage = Math.min(requestedPage, Math.max(1, Math.ceil(total / pageSize)));
  const items = await db.select({
    id: artistVaultSources.id, artistId: artistVaultSources.artistId, artistName: artists.name,
    title: artistVaultSources.title, url: artistVaultSources.url, createdAt: artistVaultSources.createdAt,
    origin: artistVaultSources.origin, activityId: artistVaultSources.activityId,
    actorKind: artistActivityEvents.actorKind, actorId: users.id, actorName: users.username,
    actorEmail: users.email, trigger: artistActivityEvents.trigger, claimed,
  }).from(artistVaultSources)
    .innerJoin(artists, eq(artistVaultSources.artistId, artists.id))
    .leftJoin(artistActivityEvents, eq(artistVaultSources.activityId, artistActivityEvents.id))
    .leftJoin(users, eq(artistActivityEvents.actorUserId, users.id)).where(where).orderBy(desc(artistVaultSources.createdAt), desc(artistVaultSources.id))
    .limit(pageSize).offset((currentPage - 1) * pageSize);
  return { items, total, pendingTotal, page: currentPage, pageSize, query: search, origin: selectedOrigin, claim: selectedClaim };
}
