import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/server/auth";
import { db } from "@/server/db/drizzle";
import { bookmarks, artists } from "@/server/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET - Fetch user's bookmarks
export async function GET(request: NextRequest) {
  try {
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
      return NextResponse.json({ bookmarks: [] }, { status: 200 });
    }

    // Fetch bookmarks ordered by order_index, then by created_at desc for new items
    const userBookmarks = await db
      .select({
        id: bookmarks.id,
        artistId: bookmarks.artistId,
        artistName: bookmarks.artistName,
        imageUrl: bookmarks.imageUrl,
        orderIndex: bookmarks.orderIndex,
        createdAt: bookmarks.createdAt,
      })
      .from(bookmarks)
      .where(eq(bookmarks.userId, userId))
      .orderBy(bookmarks.orderIndex, desc(bookmarks.createdAt));

    return NextResponse.json({ bookmarks: userBookmarks }, { status: 200 });
  } catch (error) {
    console.error("[bookmarks GET] error", error);
    return NextResponse.json({ bookmarks: [] }, { status: 500 });
  }
}

// POST - Add a new bookmark
export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { artistId, artistName, imageUrl } = body;

    if (!artistId || !artistName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if bookmark already exists
    const existingBookmark = await db.query.bookmarks.findFirst({
      where: and(eq(bookmarks.userId, userId), eq(bookmarks.artistId, artistId)),
    });

    if (existingBookmark) {
      return NextResponse.json({ error: "Bookmark already exists" }, { status: 409 });
    }

    // Get the current max order_index and add new bookmark at the front (order_index 0)
    // Increment all existing bookmarks by 1
    await db
      .update(bookmarks)
      .set({ orderIndex: sql`order_index + 1` })
      .where(eq(bookmarks.userId, userId));

    // Insert new bookmark at the front
    const newBookmark = await db
      .insert(bookmarks)
      .values({
        userId,
        artistId,
        artistName,
        imageUrl,
        orderIndex: 0,
      })
      .returning();

    return NextResponse.json({ bookmark: newBookmark[0] }, { status: 201 });
  } catch (error) {
    console.error("[bookmarks POST] error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Remove a bookmark
export async function DELETE(request: NextRequest) {
  try {
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const artistId = searchParams.get("artistId");

    if (!artistId) {
      return NextResponse.json({ error: "Missing artistId" }, { status: 400 });
    }

    // Delete the bookmark
    const deleted = await db
      .delete(bookmarks)
      .where(and(eq(bookmarks.userId, userId), eq(bookmarks.artistId, artistId)))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ error: "Bookmark not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[bookmarks DELETE] error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
