import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/server/auth";
import { db } from "@/server/db/drizzle";
import { ugcresearch } from "@/server/db/schema";
import { getUserById } from "@/server/utils/queries/userQueries";
import { eq, and } from "drizzle-orm";
import { getApprovedSinceLastSeen } from "@/server/utils/ugcSeenTracking";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerAuthSession();

    if (!session || !session.user?.id) {
      // Not authenticated – return 0 so client hides badge
      return NextResponse.json({ count: 0 }, { status: 200 });
    }

    // Get user data to check their last seen count
    const user = await getUserById(session.user.id);
    const userSeenCount = user?.acceptedUgcCount || 0;

    // Count all approved UGC entries for the current user
    const approvedEntries = await db.query.ugcresearch.findMany({
      where: and(eq(ugcresearch.userId, session.user.id), eq(ugcresearch.accepted, true)),
      columns: {
        id: true,
      },
    });

    const currentApprovedCount = approvedEntries.length;
    
    // Hybrid approach: Use both count-based and timestamp-based tracking
    const countBasedNewItems = Math.max(0, currentApprovedCount - userSeenCount);
    const timestampBasedNewItems = await getApprovedSinceLastSeen(session.user.id);
    
    // Use the maximum of both approaches for robustness
    // This handles edge cases where one method might miss items
    const newlyApprovedCount = Math.max(countBasedNewItems, timestampBasedNewItems);

    return NextResponse.json({ 
      count: newlyApprovedCount,
      // Optional: Include debug info (can be removed in production)
      debug: {
        totalApproved: currentApprovedCount,
        userSeenCount: userSeenCount,
        countBased: countBasedNewItems,
        timestampBased: timestampBasedNewItems
      }
    }, { status: 200 });
  } catch (e) {
    console.error("[approvedUGCCount] error", e);
    return NextResponse.json({ count: 0 }, { status: 500 });
  }
} 