import { NextRequest } from "next/server";
import { getServerAuthSession } from "@/server/auth";
import { db } from "@/server/db/drizzle";
import { ugcresearch, artists } from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

const PER_PAGE = 10;

export async function GET(request: NextRequest) {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return Response.json({ entries: [], total: 0, pageCount: 0 });
  }

  const { searchParams } = new URL(request.url);
  const pageParam = parseInt(searchParams.get("page") ?? "1", 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const siteFilter = searchParams.get("siteName");
  const noPaginate = searchParams.get("all") === "true" || (siteFilter && siteFilter !== "all");

  try {
    const userId = session.user.id;

    // Build conditions
    let conditions = eq(ugcresearch.userId, userId) as any;
    if (siteFilter && siteFilter !== "all") {
      conditions = and(conditions, eq(ugcresearch.siteName, siteFilter));
    }

    // Total count
    const total = (await db.query.ugcresearch.findMany({ where: conditions })).length;
    const pageCount = noPaginate ? 1 : Math.ceil(total / PER_PAGE);
    const offset = noPaginate ? 0 : (page - 1) * PER_PAGE;

    const baseQuery = db
      .select({
        id: ugcresearch.id,
        createdAt: ugcresearch.createdAt,
        siteName: ugcresearch.siteName,
        ugcUrl: ugcresearch.ugcUrl,
        accepted: ugcresearch.accepted,
        artistName: artists.name,
      })
      .from(ugcresearch)
      .leftJoin(artists, eq(artists.id, ugcresearch.artistId))
      .where(conditions)
      .orderBy(desc(ugcresearch.createdAt));

    const rows = noPaginate
      ? await baseQuery
      : await baseQuery.limit(PER_PAGE).offset(offset);

    return Response.json({ entries: rows, total, pageCount });
  } catch (error) {
    console.error("[API] userEntries error", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
