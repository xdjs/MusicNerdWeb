import { enqueueResearchJob } from "@/server/utils/queries/researchJobQueries";

/** Ask for an artist's feed to be read. Safe to call repeatedly. MusicNerdAPI
 *  runs the queued job (#1365).
 *
 *  `force` means the artist asked, so the scrape runs even though we already
 *  hold posts — that is how anything they published since gets picked up. */
export async function requestArtistResearch(
    artistId: string,
    opts?: { force?: boolean },
): Promise<boolean> {
    return enqueueResearchJob(artistId, "social_ingest", {
        state: opts?.force ? { force: true } : {},
    });
}
