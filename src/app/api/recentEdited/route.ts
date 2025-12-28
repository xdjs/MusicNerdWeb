import { NextResponse, NextRequest } from "next/server";
import { getServerAuthSession } from "@/server/auth";
import { db } from "@/server/db/drizzle";
import { ugcresearch, artists } from "@/server/db/schema";
import { eq, desc } from "drizzle-orm";
import { unauthorizedResponse } from "@/lib/apiErrors";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { error: "userId parameter required" },
      { status: 400 }
    );
  }

  try {
    // Get recent UGC entries for the user
    const recentUgc = await db.query.ugcresearch.findMany({
      where: eq(ugcresearch.userId, userId),
      orderBy: [desc(ugcresearch.updatedAt)],
      limit: 3,
    });

    // Get artist details for each UGC entry
    const results = await Promise.all(
      recentUgc.map(async (ugc) => {
        let artistData = null;
        if (ugc.artistId) {
          artistData = await db.query.artists.findFirst({
            where: eq(artists.id, ugc.artistId),
          });
        }
        return {
          ugcId: ugc.id,
          artistId: ugc.artistId,
          artistName: artistData?.name || ugc.name,
          updatedAt: ugc.updatedAt,
          imageUrl: null, // Artist images are loaded via Spotify API on client side
        };
      })
    );

    return NextResponse.json(results);
  } catch (error) {
    console.error("[API] recentEdited error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
