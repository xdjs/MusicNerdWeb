import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/server/auth";
import { getUserById } from "@/server/utils/queries/userQueries";
import { db } from "@/server/db/drizzle";
import { ugcresearch } from "@/server/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { unauthorizedResponse, forbiddenResponse } from "@/lib/apiErrors";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  // Check if user is admin
  const user = await getUserById(session.user.id);
  if (!user?.isAdmin) {
    return forbiddenResponse("Admin access required");
  }

  try {
    // Count pending UGC (accepted is null or false)
    const pendingEntries = await db.query.ugcresearch.findMany({
      where: and(
        eq(ugcresearch.accepted, false),
      ),
    });

    // Also count entries where accepted is null
    const nullEntries = await db.query.ugcresearch.findMany({
      where: isNull(ugcresearch.accepted),
    });

    const count = pendingEntries.length + nullEntries.length;

    return NextResponse.json({ count });
  } catch (error) {
    console.error("[API] pendingUGCCount error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
