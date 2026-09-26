/** Manual post-migration enrichment. Dry run unless --write is supplied.
 * Usage: npx tsx scripts/backfill-podcast-episode-identity.ts <artist-uuid> [--write]
 */
import "dotenv/config";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../src/server/db/drizzle";
import { artistVaultSources } from "../src/server/db/schema";
import { fetchPageContent } from "../src/server/utils/fetchPageContent";
import { podcastService } from "../src/lib/source/podcastService";

async function main() {
    const artistId = process.argv[2];
    const write = process.argv.includes("--write");
    if (!artistId || !/^[0-9a-f-]{36}$/i.test(artistId)) throw new Error("Pass an artist UUID; add --write only after inspecting the dry run.");
    const sources = await db.select().from(artistVaultSources).where(eq(artistVaultSources.artistId, artistId));
    for (const source of sources) {
        if (source.podcastEpisodeKey || !podcastService(source.url)) continue;
        const page = await fetchPageContent(source.url);
        const identity = page.podcastEpisode;
        console.log(JSON.stringify({ sourceId: source.id, url: source.url, status: source.status, identity }));
        if (!write || !identity) continue;
        await db.update(artistVaultSources).set(identity)
            .where(and(eq(artistVaultSources.id, source.id), eq(artistVaultSources.artistId, artistId), isNull(artistVaultSources.podcastEpisodeKey)));
    }
    console.log(write ? "Enrichment complete." : "Dry run only; no rows changed.");
}

main().catch(error => { console.error(error); process.exitCode = 1; });
