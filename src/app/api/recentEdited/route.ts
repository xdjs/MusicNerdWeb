import { NextRequest } from "next/server";
import { getServerAuthSession } from "@/server/auth";
import { db } from "@/server/db/drizzle";
import { ugcresearch, artists } from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getSpotifyHeaders, getSpotifyImage } from "@/server/utils/queries/externalApiQueries";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let userId: string | null = searchParams.get("userId");

    if (!userId) {
      // Fallback to session-based lookup
      const session = await getServerAuthSession();
      if (session?.user?.id) {
        userId = session.user.id;
      }
    }

    if (!userId) {
      return Response.json([]);
    }

    // Fetch last 20 approved edits, then dedupe by artistId to pick latest 3 unique artists
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

    const unique: Record<string, (typeof rows)[number]> = {};
    for (const row of rows) {
      if (row.artistId && !unique[row.artistId]) {
        unique[row.artistId] = row;
      }
      if (Object.keys(unique).length === 3) break;
    }

    // Enrich with Spotify images
    const headers = await getSpotifyHeaders();
    const enriched = await Promise.all(
      Object.values(unique).map(async (row) => {
        let imageUrl: string | null = null;
        if (row.spotifyId) {
          try {
            const img = await getSpotifyImage(row.spotifyId, row.artistId ?? "", headers);
            imageUrl = img.artistImage ?? null;
          } catch {
            // ignore Spotify image errors
          }
        }
        return { ...row, imageUrl };
      })
    );

    return Response.json(enriched);
  } catch (error) {
    console.error("[recentEdited] error", error);
    return Response.json([]);
  }
}
