import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/server/auth";
import { db } from "@/server/db/drizzle";
import { users, ugcresearch } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { updateUserLastSeenTimestamp } from "@/server/utils/ugcSeenTracking";

export const dynamic = "force-dynamic";

/**
 * Marks the user's approved UGC as "seen" by updating their acceptedUgcCount
 * to match their current approved UGC count in the database.
 * This replaces the localStorage-based approach.
 */
export async function POST() {
  try {
    const session = await getServerAuthSession();

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Count all approved UGC entries for the current user
    const approvedEntries = await db.query.ugcresearch.findMany({
      where: and(
        eq(ugcresearch.userId, session.user.id),
        eq(ugcresearch.accepted, true)
      ),
      columns: {
        id: true,
      },
    });

    const currentApprovedCount = approvedEntries.length;

    // Update the user's acceptedUgcCount to reflect what they've now "seen"
    await db
      .update(users)
      .set({ acceptedUgcCount: currentApprovedCount })
      .where(eq(users.id, session.user.id));

    // Also update the sentinel row timestamp for more granular tracking
    await updateUserLastSeenTimestamp(session.user.id);

    return NextResponse.json({ 
      success: true, 
      markedAsSeen: currentApprovedCount 
    }, { status: 200 });
    
  } catch (e) {
    console.error("[markApprovedUGCSeen] error", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
