import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/server/auth";
import { db } from "@/server/db/drizzle";
import { bookmarks } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

// PUT - Reorder bookmarks
export async function PUT(request: NextRequest) {
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
    const { bookmarkOrders } = body; // Array of { artistId: string, orderIndex: number }

    if (!Array.isArray(bookmarkOrders)) {
      return NextResponse.json({ error: "Invalid bookmark orders data" }, { status: 400 });
    }

    // Update all bookmark orders in a transaction
    await db.transaction(async (tx) => {
      for (const { artistId, orderIndex } of bookmarkOrders) {
        await tx
          .update(bookmarks)
          .set({ orderIndex })
          .where(and(eq(bookmarks.userId, userId!), eq(bookmarks.artistId, artistId)));
      }
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[bookmarks reorder] error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
