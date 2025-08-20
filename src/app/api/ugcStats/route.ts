import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/server/auth";
import { getUgcStatsInRange } from "@/server/utils/queries/leaderboardQueries";
import { DateRange } from "react-day-picker";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const start = performance.now();
  try {
    const session = await getServerAuthSession();
    if (!session || !session.user?.id) {
      return NextResponse.json({ ugcCount: 0, artistsCount: 0 }, { status: 200 });
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const wallet = searchParams.get('wallet');

    let dateRange: DateRange;
    if (from && to) {
      dateRange = { from: new Date(from), to: new Date(to) } as DateRange;
    } else {
      // Default to all-time stats
      dateRange = { from: new Date(0), to: new Date() } as DateRange;
    }

    const result = await getUgcStatsInRange(dateRange, wallet);
    
    return NextResponse.json(result || { ugcCount: 0, artistsCount: 0 }, { status: 200 });
  } catch (e) {
    console.error("[ugcStats] error", e);
    return NextResponse.json({ ugcCount: 0, artistsCount: 0 }, { status: 500 });
  } finally {
    const end = performance.now();
    console.debug(`[ugcStats] GET took ${end - start}ms`);
  }
}
