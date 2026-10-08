import { db } from "@/server/db/drizzle";
import { ugcresearch } from "@/server/db/schema";
import { eq, sql } from "drizzle-orm";
import { ArtistLinkConflictError, setArtistLink } from "@/server/utils/artistLinkService";

export async function approveUGC(
    ugcId: string,
    artistId: string,
    siteName: string,
    artistUrlOrId: string,
    transaction?: Parameters<Parameters<typeof db.transaction>[0]>[0],
) {
    const writer = transaction ?? db;
    try {
        // Normalise values for certain platforms before storing on the artist record
        let valueToStore = artistUrlOrId;

        // For most platforms, artistUrlOrId is now the extracted username/ID
        // Only do URL parsing for platforms that need special handling
        if (siteName === "youtubechannel") {
            // Expect channel ID, not a full URL
            // Accept both full URLs and raw IDs and convert to ID only
            try {
                const url = new URL(artistUrlOrId.startsWith("http") ? artistUrlOrId : `https://${artistUrlOrId}`);
                const parts = url.pathname.split("/").filter(Boolean);
                const channelIdx = parts.findIndex((p) => p.toLowerCase() === "channel");
                if (channelIdx !== -1 && parts[channelIdx + 1]) {
                    valueToStore = parts[channelIdx + 1];
                }
            } catch {
                const m = artistUrlOrId.match(/youtube\.com\/channel\/([^/?#]+)/i);
                if (m) valueToStore = m[1];
            }
        } else if (siteName === "youtube") {
            // Store plain username without leading @ if a URL was provided
            try {
                if (artistUrlOrId.includes("youtube.com")) {
                    const url = new URL(artistUrlOrId.startsWith("http") ? artistUrlOrId : `https://${artistUrlOrId}`);
                    const atMatch = url.pathname.match(/@([^/?#]+)/);
                    if (atMatch && atMatch[1]) {
                        valueToStore = atMatch[1];
                    }
                } else if (artistUrlOrId.startsWith("@")) {
                    valueToStore = artistUrlOrId.slice(1);
                }
            } catch {
                /* ignore */
            }
        }

        if (siteName === "wallets" || siteName === "wallet") {
            // Wallets stay inline — array_append logic unchanged
            await writer.execute(sql`
                UPDATE artists
                SET wallets = array_append(wallets, ${artistUrlOrId})
                WHERE id = ${artistId} AND NOT wallets @> ARRAY[${artistUrlOrId}]
            `);
        } else {
            if (transaction) await setArtistLink(artistId, siteName, valueToStore, undefined, transaction);
            else await setArtistLink(artistId, siteName, valueToStore);
        }

        await writer.update(ugcresearch).set({ accepted: true, dateProcessed: new Date().toISOString() }).where(eq(ugcresearch.id, ugcId));
    } catch (e) {
        console.error(`Error approving ugc`, e);
        if (e instanceof ArtistLinkConflictError) {
            throw e;
        }
        throw new Error(e instanceof Error ? `Error approving UGC: ${e.message}` : "Error approving UGC");
    }
}
