import { db } from "@/server/db/drizzle";
import { sql } from "drizzle-orm";
import { eq, gte, lte, and } from "drizzle-orm";
import { artists, ugcresearch } from "@/server/db/schema";
import { DateRange } from "react-day-picker";
import { getServerAuthSession } from "@/server/auth";
import { getUserByWallet } from "@/server/utils/queries/userQueries";

export type LeaderboardEntry = {
    userId: string;
    wallet: string;
    username: string | null;
    email: string | null;
    artistsCount: number;
    ugcCount: number;
    isHidden: boolean;
};

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
    const start = performance.now();
    try {
        const result = await db.execute<LeaderboardEntry>(sql`
            WITH artist_counts AS (
                SELECT added_by AS user_id,
                       COUNT(*) AS artist_count
                FROM artists
                GROUP BY added_by
            ),
            ugc_counts AS (
                SELECT user_id,
                       COUNT(*) AS ugc_count
                FROM ugcresearch
                GROUP BY user_id
            )
            SELECT u.id AS "userId",
                   u.wallet,
                   u.username,
                   u.email,
                   u.is_hidden AS "isHidden",
                   COALESCE(ac.artist_count, 0) AS "artistsCount",
                   COALESCE(uc.ugc_count, 0) AS "ugcCount"
            FROM users u
            LEFT JOIN artist_counts ac ON ac.user_id = u.id
            LEFT JOIN ugc_counts uc ON uc.user_id = u.id
            ORDER BY 
                CASE WHEN u.is_hidden = true THEN 1 ELSE 0 END,
                "ugcCount" DESC, 
                "artistsCount" DESC,
                CASE 
                    WHEN u.username IS NOT NULL THEN 
                        CASE WHEN u.username ~ '^[0-9]' THEN 0 ELSE 1 END
                    ELSE 
                        CASE WHEN SUBSTRING(u.wallet FROM 3) ~ '^[0-9]' THEN 0 ELSE 1 END
                    END,
                CASE 
                    WHEN u.username IS NOT NULL THEN u.username
                    ELSE SUBSTRING(u.wallet FROM 3) -- Remove '0x' prefix
                END ASC
        `);
        return result;
    } catch (e) {
        console.error("error getting leaderboard", e);
        throw new Error("Error getting leaderboard");
    } finally {
        const end = performance.now();
        console.debug(`[getLeaderboard] took ${end - start}ms`);
    }
}

// Get leaderboard stats within a date range (inclusive)
export async function getLeaderboardInRange(fromIso: string, toIso: string): Promise<LeaderboardEntry[]> {
    const start = performance.now();
    try {
        const result = await db.execute<LeaderboardEntry>(sql`
            SELECT
                u.id   AS "userId",
                u.wallet,
                u.username,
                u.email,
                u.is_hidden AS "isHidden",
                (
                    SELECT COUNT(*)::int FROM artists a 
                    WHERE a.added_by = u.id 
                      AND a.created_at BETWEEN ${fromIso} AND ${toIso}
                ) AS "artistsCount",
                (
                    SELECT COUNT(*)::int FROM ugcresearch ug 
                    WHERE ug.user_id = u.id 
                      AND ug.created_at BETWEEN ${fromIso} AND ${toIso}
                ) AS "ugcCount"
            FROM users u
            ORDER BY 
                CASE WHEN u.is_hidden = true THEN 1 ELSE 0 END,
                "ugcCount" DESC, 
                "artistsCount" DESC,
                CASE 
                    WHEN u.username IS NOT NULL THEN 
                        CASE WHEN u.username ~ '^[0-9]' THEN 0 ELSE 1 END
                    ELSE 
                        CASE WHEN SUBSTRING(u.wallet FROM 3) ~ '^[0-9]' THEN 0 ELSE 1 END
                    END,
                CASE 
                    WHEN u.username IS NOT NULL THEN u.username
                    ELSE SUBSTRING(u.wallet FROM 3) -- Remove '0x' prefix
                END ASC
        `);
        return result;
    } catch (e) {
        console.error("error getting leaderboard in range", e);
        throw new Error("Error getting leaderboard in range");
    } finally {
        const end = performance.now();
        console.debug(`[getLeaderboardInRange] took ${end - start}ms`);
    }
}

export async function getUgcStats() {
    const user = await getServerAuthSession();
    if (!user) throw new Error("Not authenticated");
    try {
        const ugcList = await db.query.ugcresearch.findMany({ where: eq(ugcresearch.userId, user.user.id) });
        return ugcList.length;
    } catch (e) {
        console.error("error getting user ugc stats", e);
    }
}

export async function getUgcStatsInRange(date: DateRange, wallet: string | null = null) {
    const walletlessEnabled = process.env.NEXT_PUBLIC_DISABLE_WALLET_REQUIREMENT === "true" && process.env.NODE_ENV !== "production";

    let session = await getServerAuthSession();
    let userId: string;

    if (walletlessEnabled && !session) {
        userId = "00000000-0000-0000-0000-000000000000";
    } else {
        if (!session) throw new Error("Not authenticated");
        userId = session.user.id;
    }

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

// Debug function to check for duplicate users
export async function checkForDuplicateUsers(): Promise<any[]> {
    const start = performance.now();
    try {
        const result = await db.execute(sql`
            SELECT 
                wallet,
                COUNT(*) as user_count,
                ARRAY_AGG(id) as user_ids,
                ARRAY_AGG(username) as usernames,
                ARRAY_AGG(email) as emails
            FROM users 
            GROUP BY wallet 
            HAVING COUNT(*) > 1
            ORDER BY user_count DESC
        `);
        return result;
    } catch (e) {
        console.error("error checking for duplicate users", e);
        return [];
    } finally {
        const end = performance.now();
        console.debug(`[checkForDuplicateUsers] took ${end - start}ms`);
    }
} 