import { NextResponse, NextRequest } from "next/server";
import { getRecentActivity } from "@/server/utils/queries/activityQueries";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest | Request) {
    const start = performance.now();
    try {
        const { searchParams } = new URL(request.url);
        const since = searchParams.get("since") ?? undefined;

        const events = await getRecentActivity(since);

        const response = events.map((e) => ({
            type: e.type,
            artistId: e.artist_id,
            artistName: e.artist_name,
            platform: e.platform?.replace("mapping:", "") ?? null,
            createdAt: e.created_at,
        }));

        return NextResponse.json(response, { status: 200 });
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to fetch activity", details: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 },
        );
    } finally {
        console.debug(`[activity] GET took ${performance.now() - start}ms`);
    }
}
