import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/server/auth";
import { db } from "@/server/db/drizzle";
import { bookmarks } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET - Check if a specific artist is bookmarked
export async function GET(
  request: NextRequest,
  { params }: { params: { artistId: string } }
) {
  try {
    const { artistId } = params;
    const session = await getServerAuthSession();
    const walletlessEnabled =
      process.env.NEXT_PUBLIC_DISABLE_WALLET_REQUIREMENT === "true" &&
      process.env.NODE_ENV !== "production";

    let userId: string | null = null;

    if (session && session.user?.id) {
      userId = session.user.id;
    } else if (walletlessEnabled) {
      userId = "00000000-0000-0000-0000-000000000000"; // guest
    }

    if (!userId) {
      return NextResponse.json({ isBookmarked: false }, { status: 200 });
    }

    // Check if this specific artist is bookmarked
    const bookmark = await db.query.bookmarks.findFirst({
      where: and(eq(bookmarks.userId, userId), eq(bookmarks.artistId, artistId)),
      columns: { id: true },
    });

    return NextResponse.json({ isBookmarked: !!bookmark }, { status: 200 });
  } catch (error) {
    console.error("[bookmarks check] error", error);
    return NextResponse.json({ isBookmarked: false }, { status: 500 });
  }
}
