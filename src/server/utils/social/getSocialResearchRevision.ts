import { sql } from 'drizzle-orm';
import { db } from '@/server/db/drizzle';

/** A small private cache revision shared with API writes; null disables cached drafts. */
export async function getSocialResearchRevision(artistId: string): Promise<string | null> {
    try {
        const rows = await db.execute(sql`select concat_ws('|', count(*)::text, max(created_at)::text,
            max(case when raw->'_musicnerdTranscript'->>'version' = '1'
                and raw->'_musicnerdTranscript'->>'actor' = 'apify/instagram-reel-scraper'
                then raw->'_musicnerdTranscript'->>'fetchedAt' end),
            (select concat_ws(':', count(*)::text, max(created_at)::text)
                from artist_social_credits where artist_id = ${artistId}::uuid)) as revision
            from artist_social_posts where artist_id = ${artistId}::uuid`);
        const value = (rows as unknown as {revision?: unknown}[])[0]?.revision;
        return typeof value === 'string' ? value : null;
    } catch {
        return null;
    }
}
