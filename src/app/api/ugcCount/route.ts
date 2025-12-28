import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/server/auth";
import { db } from "@/server/db/drizzle";
import { ugcresearch } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ count: 0 });
  }

  try {
    const userId = session.user.id;

    // Count all UGC entries for this user
    const entries = await db.query.ugcresearch.findMany({
      where: eq(ugcresearch.userId, userId),
    });

    return NextResponse.json({ count: entries.length });
  } catch (error) {
    console.error("[API] ugcCount error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
