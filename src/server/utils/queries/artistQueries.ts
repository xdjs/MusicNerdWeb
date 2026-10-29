import { approveUGC } from "./approveUGC";
export { approveUGC } from "./approveUGC";
import { db } from "@/server/db/drizzle";
import { eq, sql, inArray } from "drizzle-orm";
import { artists, ugcresearch } from "@/server/db/schema";
import { Artist, UrlMap } from "@/server/db/DbTypes";
import { isObjKey } from "@/server/utils/services";
import { getServerAuthSession } from "@/server/auth";

import { getUserById } from "@/server/utils/queries/userQueries";

// ----------------------------------
// Types
// ----------------------------------

export type ArtistLink = UrlMap & {
    artistUrl: string;
};

export type RemoveArtistDataResp = {
    status: "success" | "error";
    message: string;
    data?: string | null;
};

// ----------------------------------
// Artist helpers & basic look-ups
// ----------------------------------

// Searches for artists in the database by name using fuzzy matching and similarity scoring
export async function searchForArtistByName(name: string) {
    try {
        const startTime = performance.now();

        // Normalise the incoming query (lower-case, accents & punctuation removed)
        const normalisedQuery = normaliseText(name);
        // Older lcname values omit spaces (e.g. "peterango"), while new
        // records preserve them. Match both forms before limiting the local
        // results, otherwise an existing artist can appear as external-only.
        const compactQuery = normalisedQuery.replace(/\s+/g, "");
        const nameMatch = compactQuery && compactQuery !== normalisedQuery
            ? sql`(lcname LIKE '%' || ${normalisedQuery} || '%' OR lcname LIKE '%' || ${compactQuery} || '%')`
            : sql`lcname LIKE '%' || ${normalisedQuery} || '%'`;
        const matchPosition = compactQuery && compactQuery !== normalisedQuery
            ? sql`COALESCE(NULLIF(POSITION(${normalisedQuery} IN lcname), 0), POSITION(${compactQuery} IN lcname))`
            : sql`POSITION(${normalisedQuery} IN lcname)`;

        try {
            await db.execute(sql`SET LOCAL pg_trgm.similarity_threshold = 0.3;`);
        } catch (err) {
            console.error("Error setting pg_trgm similarity threshold", err);
            throw err;
        }
        const result = await db.execute<Artist>(sql`
            SELECT
            id, name, spotify, deezer, bandcamp, youtube, youtubechannel,
            instagram, x, facebook, tiktok,
            custom_image AS "customImage",
            CASE WHEN ${nameMatch} THEN 0 ELSE 1 END AS match_type
            FROM artists
            WHERE
            ${nameMatch}
            OR lcname % ${normalisedQuery}          -- ← indexable equivalent to similarity(...) >= 0.3
            ORDER BY
            match_type ASC,
            CASE
                WHEN ${nameMatch}
                THEN -${matchPosition}
                ELSE -999999
            END DESC,
            similarity(lcname, ${normalisedQuery}) DESC   -- keep for ranking
            LIMIT 10;
        `);

        const endTime = performance.now();
        console.debug(`Search for "${name}" (normalised: "${normalisedQuery}") took ${endTime - startTime}ms`);
        return result;
    } catch (e) {
        console.error(`Error fetching artist by name`, e);
        throw new Error("Error searching for artist by name");
    }
}

export async function getArtistById(id: string) {
    try {
        const result = await db.query.artists.findFirst({
            where: eq(artists.id, id),
        });
        return result;
    } catch (e) {
        console.error(`Error fetching artist by Id`, e);
        throw new Error("Error fetching artist by Id");
    }
}

// ----------------------------------
// Links helpers
// ----------------------------------

/** The urlmap changes when someone adds a platform, which is rare, and it is
 *  read on EVERY extractArtistId call — so discovery, which resolves dozens of
 *  URLs per run, was doing dozens of whole-table selects. A short TTL keeps it
 *  fresh enough for an admin adding a platform while removing the repeat cost
 *  inside a single run. Deliberately a plain module-level memo rather than
 *  unstable_cache: this is called from detached background work where
 *  unstable_cache throws (see cachedOrDirect). */
const URLMAP_TTL_MS = 60_000;
let urlmapCache: { rows: Awaited<ReturnType<typeof db.query.urlmap.findMany>>; at: number } | null = null;

export async function getAllLinks() {
    if (urlmapCache && Date.now() - urlmapCache.at < URLMAP_TTL_MS) return urlmapCache.rows;
    const start = performance.now();
    try {
        const rows = (await db.query.urlmap.findMany()).filter(row => !['catalog', 'foundation', 'soundxyz', 'sound'].includes(row.siteName));
        urlmapCache = { rows, at: Date.now() };
        return rows;
    } finally {
        console.debug(`[getAllLinks] took ${performance.now() - start}ms`);
    }
}

export async function getArtistLinks(artist: Artist): Promise<ArtistLink[]> {
    try {
        const allLinkObjects = await getAllLinks();
        if (!artist) throw new Error("Artist not found");
        const artistLinksSiteNames: ArtistLink[] = [];
        // Check if both YouTube columns have data to implement preference logic
        const hasYoutubeUsername = artist.youtube?.toString()?.trim();
        const hasYoutubeChannel = artist.youtubechannel?.toString()?.trim();
        
        // Check if both Facebook columns have data to implement preference logic
        const hasFacebookUsername = artist.facebook?.toString()?.trim();
        const hasFacebookId = artist.facebookId?.toString()?.trim();

        for (const platform of allLinkObjects) {
            if (platform.siteName === "ens" || platform.siteName === "wallets") continue;
            
            // Skip youtubechannel platform if both youtube and youtubechannel have data (prefer username)
            if (platform.siteName === "youtubechannel" && hasYoutubeUsername && hasYoutubeChannel) {
                continue;
            }
            
            // Skip facebookID platform if both facebook and facebookID have data (prefer username)
            if (platform.siteName === "facebookID" && hasFacebookUsername && hasFacebookId) {
                continue;
            }
            
            // Handle the special case where platform.siteName is "facebookID" but artist property is "facebookId"
            const artistPropertyName = platform.siteName === "facebookID" ? "facebookId" : platform.siteName;
            
            if (
                isObjKey(artistPropertyName, artist) &&
                artist[artistPropertyName] !== null &&
                artist[artistPropertyName] !== undefined &&
                artist[artistPropertyName] !== ""
            ) {
                let artistUrl = platform.appStringFormat;
                if (platform.siteName === "youtubechannel") {
                    // Handle YouTube channel URL construction - only use youtubechannel column
                    const youtubeChannelValue = artist[platform.siteName]?.toString()?.trim() ?? "";
                    
                    if (youtubeChannelValue) {
                        // Check if youtubechannel column contains username data (starts with @) or channel ID
                        if (youtubeChannelValue.startsWith("@")) {
                            // It's username data stored in youtubechannel column (legacy state)
                            const cleanUsername = youtubeChannelValue.substring(1);
                            artistUrl = `https://youtube.com/@${cleanUsername}`;
                        } else {
                            // It's actual channel ID data
                            artistUrl = `https://www.youtube.com/channel/${youtubeChannelValue}`;
                        }
                    } else {
                        // No YouTube channel data available, skip this platform
                        continue;
                    }
                } else if (platform.siteName === "youtube") {
                    // Handle dedicated YouTube username platform
                    const youtubeUsername = artist[platform.siteName]?.toString()?.trim() ?? "";
                    if (youtubeUsername) {
                        // Remove @ prefix if present, we'll add it in the URL
                        const cleanUsername = youtubeUsername.startsWith("@") ? youtubeUsername.substring(1) : youtubeUsername;
                        artistUrl = `https://youtube.com/@${cleanUsername}`;
                    } else {
                        continue;
                    }
                } else if (platform.siteName === "supercollector") {
                    const value = artist[platform.siteName]?.toString() ?? "";
                    const ethRemoved = value.endsWith(".eth") ? value.slice(0, -4) : value;
                    artistUrl = platform.appStringFormat.replace("%@", ethRemoved);
                } else if (platform.siteName === "soundcloud") {
                    const value = artist[platform.siteName]?.toString() ?? "";
                    if (!value || /^\d+$/.test(value)) {
                        continue;
                    }
                    artistUrl = platform.appStringFormat.replace("%@", value);
                } else if (platform.siteName === "facebookID" as string) {
                    // Handle Facebook ID format - facebookID column now stores full URLs
                    const facebookUrl = artist.facebookId?.toString()?.trim() ?? "";
                    if (facebookUrl) {
                        // Use the stored URL directly (it's already a complete Facebook URL)
                        artistUrl = facebookUrl;
                    } else {
                        continue;
                    }
                } else {
                    artistUrl = platform.appStringFormat.replace("%@", artist[artistPropertyName]?.toString() ?? "");
                }
                artistLinksSiteNames.push({ ...platform, artistUrl });
            }
        }
        artistLinksSiteNames.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        return artistLinksSiteNames;
    } catch (e) {
        throw new Error("Error fetching artist links");
    }
}

// ----------------------------------
// UGC approval / submission flows
// ----------------------------------

export async function approveUgcAdmin(ugcIds: string[]) {
    const user = await getServerAuthSession();
    if (!user) throw new Error("Not authenticated");
    const dbUser = await getUserById(user.user.id);
    if (!dbUser || !dbUser.isAdmin) throw new Error("Not authorized");

    try {
        const ugcData = await db.query.ugcresearch.findMany({ where: inArray(ugcresearch.id, ugcIds) });
        const approvalResults = await Promise.allSettled(
            ugcData.map(async (ugc) => {
                await approveUGC(ugc.id, ugc.artistId ?? "", ugc.siteName ?? "", ugc.siteUsername ?? "");
            })
        );

        const failures = approvalResults.flatMap((result, index) => {
            if (result.status === "fulfilled") return [];

            const reason = result.reason instanceof Error
                ? result.reason.message
                : String(result.reason);
            return [{ ugcId: ugcData[index]?.id ?? "unknown", reason }];
        });

        if (failures.length > 0) {
            const approvedCount = approvalResults.length - failures.length;
            return {
                status: "error",
                message: `Approved ${approvedCount} of ${approvalResults.length} UGC items. Failed: ${failures
                    .map(({ ugcId, reason }) => `${ugcId} (${reason})`)
                    .join("; ")}`,
            };
        }
    } catch (e) {
        console.error("error approving ugc:", e);
        return { status: "error", message: "Error approving UGC" };
    }
    return { status: "success", message: "UGC approved" };
}

// ----------------------------------
// UGC stats & retrieval
// ----------------------------------

// Removed getUgcStats and getUgcStatsInRange – these functions have been moved to leaderboardQueries.ts

// ----------------------------------
// Misc helpers
// ----------------------------------

// NOTE: Consider adding an index on (spotify) column for better performance:
// CREATE INDEX IF NOT EXISTS idx_artists_spotify ON artists(spotify) WHERE spotify IS NOT NULL;
export async function getAllSpotifyIds(): Promise<string[]> {
    try {
        // Limit the result set - we don't need ALL Spotify IDs for filtering, just a reasonable subset
        const result = await db.execute<{ spotify: string }>(sql`
            SELECT spotify 
            FROM artists 
            WHERE spotify IS NOT NULL 
            LIMIT 10000
        `);
        return result.map((r) => r.spotify);
    } catch (e) {
        console.error("Error fetching Spotify IDs:", e);
        return [];
    }
}

// Helper to remove accents/diacritics and optionally lowercase the result
function normaliseText(input: string): string {
    return input
        .normalize("NFD") // decompose accented chars into base + mark
        .replace(/[\u0300-\u036f]/g, "") // strip the marks
        .replace(/[^\p{L}\p{N}\s]+/gu, '') // strip punctuation; keep letters, numbers, spaces
        .toLowerCase();
} 

/**
 * Names that identify EXACTLY ONE artist in this directory.
 *
 * The ask names people it cannot link — Nia Sultana, Kilo Kish, Jesse Boykins
 * III — because linking has only ever worked from a stored Instagram handle,
 * and most people named in an answer arrive from prose rather than from a
 * caption credit. A name lookup fixes that and reintroduces the hazard this
 * whole pipeline exists to fight: three artists in here are called some version
 * of "Black Dave".
 *
 * So uniqueness is the contract, not a nicety. A name matching two rows returns
 * nothing and the reader gets plain text, which is the correct outcome — there
 * is no way to tell from a sentence which of two artists was meant, and a
 * confident link to the wrong person is worse than no link.
 *
 * Exact folded equality, never a prefix: "Dave" must not resolve to "Dave East".
 * One query for the whole answer rather than one per name.
 */
export async function findUniqueArtistsByName(names: string[]): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    // Unicode, and a low floor. [^a-z0-9] emptied every name in a non-Latin
    // script, and a four-character minimum excludes most Japanese and Korean
    // names outright. The safety here is not length: it is uniqueness, plus the
    // caller's rules that a name must appear in the material we supplied and
    // that a single-word name must belong to somebody the artist has credited.
    const fold = (v: string) => v.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
    const wanted = [...new Set(names.map(fold).filter(n => n.length >= 2))];
    if (wanted.length === 0) return out;
    try {
        const literal = `{${wanted.map(n => `"${n.replace(/"/g, '\\"')}"`).join(",")}}`;
        const rows = await db.execute(sql`
            select regexp_replace(lower(name), '[^[:alnum:]]', '', 'g') as folded,
                   min(id::text) as id,
                   count(*) as n
              from artists
             where regexp_replace(lower(name), '[^[:alnum:]]', '', 'g') = any(${literal}::text[])
             group by 1`);
        const list = (rows as { rows?: unknown[] }).rows ?? (rows as unknown[]) ?? [];
        for (const r of list as Record<string, unknown>[]) {
            // Two artists share this name. Neither gets the link.
            if (Number(r.n) !== 1) continue;
            out.set(String(r.folded), String(r.id));
        }
        return out;
    } catch (e) {
        // Fail closed: a database error is not evidence that a name is unique.
        console.error("[findUniqueArtistsByName] Error:", e);
        return new Map();
    }
}

/**
 * Artists in this directory whose Instagram matches one of these handles.
 *
 * Used to turn a credited collaborator into a link to their own profile. Some
 * stored handles carry a legacy leading "@", so both sides are trimmed — the
 * same mismatch that had the collision guard report a claimed handle as free.
 */
export async function findArtistsByInstagram(handles: string[]): Promise<{ id: string; instagram: string | null }[]> {
    const wanted = handles.map(h => h.toLowerCase().replace(/^@/, "")).filter(Boolean);
    if (wanted.length === 0) return [];
    try {
        // Bound as a text[] literal rather than a JS array: the driver rejects
        // a bare array here with "Array value must start with {".
        const literal = `{${wanted.map(h => `"${h.replace(/"/g, '\\"')}"`).join(",")}}`;
        const rows = await db.execute(sql`
            select id, instagram from artists
             where instagram is not null
               and lower(ltrim(instagram, '@')) = any(${literal}::text[])`);
        const list = (rows as { rows?: unknown[] }).rows ?? (rows as unknown[]) ?? [];
        return (list as Record<string, unknown>[]).map(r => ({
            id: String(r.id),
            instagram: r.instagram === null || r.instagram === undefined ? null : String(r.instagram),
        }));
    } catch (e) {
        console.error("[findArtistsByInstagram] Error:", e);
        return [];
    }
}
