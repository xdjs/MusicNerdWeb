import { db } from "@/server/db/drizzle";
import { eq, gte, lte, and } from "drizzle-orm";
import { artists, ugcresearch } from "@/server/db/schema";
import type { DateRange } from "react-day-picker";
import { getServerAuthSession } from "@/server/auth";
import { getUserByWallet } from "@/server/utils/queries/userQueries";

export async function getUgcStatsInRange(date: DateRange, wallet: string | null = null) {
    let session = await getServerAuthSession();
    if (!session) throw new Error("Not authenticated");
    let userId: string = session.user.id;

    if (wallet) {
        const searchedUser = await getUserByWallet(wallet);
        if (!searchedUser) throw new Error("User not found");
        userId = searchedUser.id;
    }

    try {
        const ugcList = await db.query.ugcresearch.findMany({
            where: and(
                gte(ugcresearch.createdAt, date.from?.toISOString() ?? ""),
                lte(ugcresearch.createdAt, date.to?.toISOString() ?? ""),
                eq(ugcresearch.userId, userId)
            ),
        });
        const artistsList = await db.query.artists.findMany({
            where: and(
                gte(artists.createdAt, date.from?.toISOString() ?? ""),
                lte(artists.createdAt, date.to?.toISOString() ?? ""),
                eq(artists.addedBy, userId)
            ),
        });
        return { ugcCount: ugcList.length, artistsCount: artistsList.length };
    } catch (e) {
        console.error("error getting ugc stats for user in range", e);
    }
}
