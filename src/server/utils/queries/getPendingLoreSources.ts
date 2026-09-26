import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/server/db/drizzle";
import { artists, artistVaultSources } from "@/server/db/schema";

/** A bounded admin view of the shared pending Lore queue. Authorization is checked by the caller. */
export async function getPendingLoreSources({ page = 1, query = "" }: { page?: number; query?: string } = {}) {
  const pageSize = 25;
  const requestedPage = Number.isSafeInteger(page) && page > 0 ? Math.min(page, 1000) : 1;
  const search = query.trim().slice(0, 100);
  const pattern = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
  const pending = eq(artistVaultSources.status, "pending");
  const where = search
    ? and(pending, or(ilike(artists.name, pattern), ilike(artistVaultSources.title, pattern), ilike(artistVaultSources.url, pattern)))
    : pending;

  const [pendingCounts, matchCounts] = await Promise.all([
    db.select({ total: count() }).from(artistVaultSources).where(pending),
    search ? db.select({ total: count() }).from(artistVaultSources)
      .innerJoin(artists, eq(artistVaultSources.artistId, artists.id)).where(where) : null,
  ]);
  const pendingTotal = pendingCounts[0]?.total ?? 0;
  const total = matchCounts?.[0]?.total ?? pendingTotal;
  const currentPage = Math.min(requestedPage, Math.max(1, Math.ceil(total / pageSize)));
  const items = await db.select({
      id: artistVaultSources.id,
      artistId: artistVaultSources.artistId,
      artistName: artists.name,
      title: artistVaultSources.title,
      url: artistVaultSources.url,
      createdAt: artistVaultSources.createdAt,
    }).from(artistVaultSources)
    .innerJoin(artists, eq(artistVaultSources.artistId, artists.id))
    .where(where).orderBy(desc(artistVaultSources.createdAt), desc(artistVaultSources.id))
    .limit(pageSize).offset((currentPage - 1) * pageSize);

  return { items, total, pendingTotal, page: currentPage, pageSize, query: search };
}
