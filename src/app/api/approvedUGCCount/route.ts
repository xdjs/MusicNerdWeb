import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/server/auth";
import { db } from "@/server/db/drizzle";
import { ugcresearch } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerAuthSession();
    if (!session || !session.user?.id) {
      return NextResponse.json({ count: 0 }, { status: 200 });
    }

    const approvedEntries = await db.query.ugcresearch.findMany({
      where: and(eq(ugcresearch.userId, session.user.id), eq(ugcresearch.accepted, true)),
      columns: { id: true },
    });

    return NextResponse.json({ count: approvedEntries.length }, { status: 200 });
  } catch (e) {
    console.error("[approvedUGCCount] error", e);
    return NextResponse.json({ count: 0 }, { status: 500 });
  }
}
