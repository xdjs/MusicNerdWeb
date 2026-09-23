import { db } from "@/server/db/drizzle";
import { sql } from "drizzle-orm";
import type { KeptSource } from "@/server/utils/evals/judgeKeptSources";

/** The social columns research fills; the research benchmark's list. */
const HANDLE_COLUMNS = ["instagram", "x", "youtube", "tiktok", "facebook", "soundcloud", "bandcamp", "twitch"] as const;

/** Catalogue identities that render as Links, and the artist URL each one stands for. */
const MAPPING_URLS: Record<string, (id: string) => string> = {
    apple_music: id => `https://music.apple.com/us/artist/${id}`,
    beatport: id => `https://www.beatport.com/artist/${id}`,
};

/** The two platforms #1273 is about: a profile-typed source on either of these hosts is a
 *  profile stored in Lore. Other profile pages in the vault are a different question. */
const PROFILE_HOSTS = ["music.apple.com", "beatport.com"];

export type ResearchOutcome = {
    /** Platform column → stored handle, for `scoreHandles`. */
    handles: Record<string, string | null>;
    /** Every vault source URL, for `scoreForbiddenHosts`. */
    sourceUrls: string[];
    /** Profile URLs the page shows as Links: website-typed sources and catalogue mappings. */
    links: string[];
    /** Profile-typed sources on #1273's hosts, which the page shows in Lore. */
    loreProfiles: string[];
    /** Every vault source as the page lists it, for the relevance judge. */
    sources: KeptSource[];
};

/**
 * What research left on the artist's page, read the way the page reads it today:
 * handles from the artist row, sources from the vault, Links from website-typed sources
 * (`OfficialSiteLinks`) and catalogue mappings, Lore from profile-typed sources
 * (`PressAndFeatures`). When #1273 settles where a verified profile URL is stored, this
 * is the one place the suite changes.
 */
export async function readResearchOutcome(artistId: string): Promise<ResearchOutcome> {
    const artist = rows(await db.execute(sql.raw(`select ${HANDLE_COLUMNS.join(", ")} from artists where id = '${artistId}'`)))[0] ?? {};
    const sources = rows(await db.execute(sql`select url, type, title, snippet from artist_vault_sources where artist_id = ${artistId}::uuid`));
    const mappings = rows(await db.execute(sql`select platform, platform_id from artist_id_mappings where artist_id = ${artistId}::uuid`));

    const handles: Record<string, string | null> = {};
    for (const column of HANDLE_COLUMNS) if (column in artist) handles[column] = artist[column] ?? null;

    const sourceUrls = sources.map(s => String(s.url));
    const links = [
        ...sources.filter(s => s.type === "website").map(s => String(s.url)),
        ...mappings.filter(m => m.platform && m.platform in MAPPING_URLS).map(m => MAPPING_URLS[m.platform as string](String(m.platform_id))),
    ];
    const loreProfiles = sources
        .filter(s => s.type === "profile" && PROFILE_HOSTS.some(host => String(s.url).includes(host)))
        .map(s => String(s.url));
    const kept = sources.map(s => ({ url: String(s.url), title: s.title ?? null, snippet: s.snippet ?? null }));
    return { handles, sourceUrls, links, loreProfiles, sources: kept };
}

/** postgres-js returns the row list itself; other drivers wrap it in `{ rows }`. */
function rows(result: unknown): Array<Record<string, string | null>> {
    if (Array.isArray(result)) return result;
    return (result as { rows?: Array<Record<string, string | null>> }).rows ?? [];
}
