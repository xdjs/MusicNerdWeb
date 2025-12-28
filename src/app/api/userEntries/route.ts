import { NextResponse, NextRequest } from "next/server";
import { getServerAuthSession } from "@/server/auth";
import { db } from "@/server/db/drizzle";
import { ugcresearch } from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

const PER_PAGE = 10;

export async function GET(request: NextRequest) {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    // Return empty results for unauthenticated users
    return NextResponse.json({ entries: [], total: 0, pageCount: 0 });
  }

  const { searchParams } = new URL(request.url);
  const pageParam = parseInt(searchParams.get("page") ?? "1", 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const siteFilter = searchParams.get("filter");

  try {
    const userId = session.user.id;

    // Build conditions
    let conditions = eq(ugcresearch.userId, userId) as any;
    if (siteFilter && siteFilter !== "all") {
      conditions = and(conditions, eq(ugcresearch.siteName, siteFilter));
    }

    // Get total count
    const allEntries = await db.query.ugcresearch.findMany({
      where: conditions,
    });
    const total = allEntries.length;

    // Get paginated entries
    const entries = await db.query.ugcresearch.findMany({
      where: conditions,
      orderBy: [desc(ugcresearch.createdAt)],
      limit: PER_PAGE,
      offset: (page - 1) * PER_PAGE,
    });

    const pageCount = Math.ceil(total / PER_PAGE);

    return NextResponse.json({
      entries: entries.map((e) => ({
        id: e.id,
        createdAt: e.createdAt,
        artistName: e.name,
        siteName: e.siteName,
        ugcUrl: e.ugcUrl,
        accepted: e.accepted,
      })),
      total,
      pageCount,
    });
  } catch (error) {
    console.error("[API] userEntries error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
