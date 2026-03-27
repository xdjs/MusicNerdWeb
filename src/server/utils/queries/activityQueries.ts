import { db } from "@/server/db/drizzle";
import { sql } from "drizzle-orm";

export type ActivityEvent = {
    type: "agent_mapping" | "ugc_approved" | "artist_added";
    artist_id: string;
    artist_name: string;
    platform: string | null;
    created_at: string;
};

export async function getRecentActivity(
    since?: string,
    limit = 15,
): Promise<ActivityEvent[]> {
    const rows = await db.execute<ActivityEvent>(sql`
        (SELECT 'agent_mapping' AS type, al.artist_id, a.name AS artist_name,
                al.field AS platform, al.created_at
         FROM mcp_audit_log al
         INNER JOIN artists a ON a.id = al.artist_id
         WHERE al.action = 'resolve' AND al.field LIKE 'mapping:%'
           AND (${since}::timestamptz IS NULL OR al.created_at > ${since}::timestamptz)
         ORDER BY al.created_at DESC LIMIT ${limit})

        UNION ALL

        (SELECT 'ugc_approved' AS type, u.artist_id, u.name AS artist_name,
                u.site_name AS platform, u.date_processed AS created_at
         FROM ugcresearch u
         WHERE u.accepted = true AND u.date_processed IS NOT NULL
           AND (${since}::timestamptz IS NULL OR u.date_processed > ${since}::timestamptz)
         ORDER BY u.date_processed DESC LIMIT ${limit})

        UNION ALL

        (SELECT 'artist_added' AS type, ar.id AS artist_id, ar.name AS artist_name,
                NULL AS platform, ar.created_at
         FROM artists ar
         WHERE (${since}::timestamptz IS NULL OR ar.created_at > ${since}::timestamptz)
         ORDER BY ar.created_at DESC LIMIT ${limit})

        ORDER BY created_at DESC
        LIMIT ${limit}
    `);

    return [...rows];
}
