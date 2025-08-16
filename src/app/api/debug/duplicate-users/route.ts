import { NextResponse } from "next/server";
import { checkForDuplicateUsers } from "@/server/utils/queries/leaderboardQueries";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const duplicates = await checkForDuplicateUsers();
        return NextResponse.json({ duplicates }, { status: 200 });
    } catch (error) {
        console.error("Error checking for duplicate users:", error);
        return NextResponse.json(
            { error: "Failed to check for duplicate users" },
            { status: 500 }
        );
    }
}
