import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/server/auth";
import { getPendingUGC } from "@/server/utils/queries/artistQueries";
import { getUserById } from "@/server/utils/queries/userQueries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerAuthSession();
    if (!session || !session.user?.id) {
      return NextResponse.json({ count: 0 }, { status: 200 });
    }

    const dbUser = await getUserById(session.user.id);
    if (!dbUser?.isAdmin) {
      return NextResponse.json({ count: 0 }, { status: 200 });
    }

    const pending = await getPendingUGC();
    return NextResponse.json({ count: pending.length }, { status: 200 });
  } catch (e) {
    console.error("[pendingUGCCount] error", e);
    return NextResponse.json({ count: 0 }, { status: 500 });
  }
}
