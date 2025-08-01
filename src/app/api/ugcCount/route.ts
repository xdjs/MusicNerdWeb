import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/server/auth";
import { db } from "@/server/db/drizzle";
import { ugcresearch } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerAuthSession();
    if (!session || !session.user?.id) {
      return NextResponse.json({ count: 0 }, { status: 200 });
    }

    // Count all UGC entries for this user regardless of approval state
    const items = await db.query.ugcresearch.findMany({
      where: eq(ugcresearch.userId, session.user.id),
      columns: { id: true },
    });

    return NextResponse.json({ count: items.length }, { status: 200 });
  } catch (e) {
    console.error("[ugcCount] error", e);
    return NextResponse.json({ count: 0 }, { status: 500 });
  }
} 