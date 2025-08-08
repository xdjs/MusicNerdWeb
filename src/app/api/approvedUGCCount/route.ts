import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/server/auth";
import { db } from "@/server/db/drizzle";
import { ugcresearch } from "@/server/db/schema";
import { getUserById } from "@/server/utils/queries/userQueries";
import { eq, and } from "drizzle-orm";

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
    
    // Return count of newly approved items (those the user hasn't "seen" yet)
    const newlyApprovedCount = Math.max(0, currentApprovedCount - userSeenCount);

    return NextResponse.json({ count: newlyApprovedCount }, { status: 200 });
  } catch (e) {
    console.error("[approvedUGCCount] error", e);
    return NextResponse.json({ count: 0 }, { status: 500 });
  }
} 