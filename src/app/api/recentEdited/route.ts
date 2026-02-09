import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/server/auth";
import { db } from "@/server/db/drizzle";
import { ugcresearch, artists } from "@/server/db/schema";
import { desc, eq, and } from "drizzle-orm";
import { getSpotifyHeaders, getSpotifyImage } from "@/server/utils/queries/externalApiQueries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let userId: string | null = searchParams.get('userId');

    if (!userId) {
      const session = await getServerAuthSession();
      if (session?.user?.id) {
        userId = session.user.id;
      }
    }

    if (!userId) {
      return NextResponse.json([], { status: 200 });
    }

    const rows = await db
      .select({
        ugcId: ugcresearch.id,
        artistId: ugcresearch.artistId,
        updatedAt: ugcresearch.updatedAt,
        artistName: artists.name,
        spotifyId: artists.spotify,
      })
      .from(ugcresearch)
      .leftJoin(artists, eq(artists.id, ugcresearch.artistId))
      .where(and(eq(ugcresearch.userId, userId), eq(ugcresearch.accepted, true)))
      .orderBy(desc(ugcresearch.updatedAt))
      .limit(20);

    const unique: { [k: string]: any } = {};
    for (const row of rows) {
      if (row.artistId && !unique[row.artistId]) {
        unique[row.artistId] = row;
      }
      if (Object.keys(unique).length === 3) break;
    }

    const headers = await getSpotifyHeaders();
    const enriched = await Promise.all(Object.values(unique).map(async (row: any) => {
      let imageUrl: string | null = null;
      if (row.spotifyId) {
        try {
          const img = await getSpotifyImage(row.spotifyId, row.artistId ?? "", headers);
          imageUrl = img.artistImage ?? null;
        } catch (e) { /* ignore */ }
      }
      return { ...row, imageUrl };
    }));

    return NextResponse.json(enriched, { status: 200 });
  } catch (e) {
    console.error("[recentEdited] error", e);
    return NextResponse.json([], { status: 500 });
  }
}
