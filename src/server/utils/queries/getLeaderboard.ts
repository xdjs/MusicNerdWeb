import { db } from "@/server/db/drizzle";
import { sql } from "drizzle-orm";
import type { LeaderboardEntry } from "./leaderboardTypes";

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
                (COALESCE(uc.ugc_count, 0) + COALESCE(ac.artist_count, 0)) DESC,
                COALESCE(uc.ugc_count, 0) DESC,
                COALESCE(ac.artist_count, 0) DESC,
                CASE
                    WHEN u.username IS NOT NULL THEN
                        CASE WHEN u.username ~ '^[0-9]' THEN 0 ELSE 1 END
                    ELSE
                        CASE WHEN u.wallet ~ '^0x[0-9]' THEN 0 ELSE 1 END
                    END,
                CASE
                    WHEN u.username IS NOT NULL THEN u.username
                    ELSE u.wallet
                END ASC
        `);
        // Filter before callers calculate totals, pagination or ranks.
        return result.filter(entry => entry.ugcCount > 0 || entry.artistsCount > 0);
    } catch (e) {
        console.error("error getting leaderboard", e);
        throw new Error("Error getting leaderboard");
    } finally {
        const end = performance.now();
        console.debug(`[getLeaderboard] took ${end - start}ms`);
    }
}
