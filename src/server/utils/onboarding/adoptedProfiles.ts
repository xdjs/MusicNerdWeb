import type { DiscoveredProfile } from "@/server/utils/profileDiscovery";
import { buildLinkPresentationMeta, type UrlmapPresentationRow } from "@/server/utils/linkPresentation";

type Row = Record<string, unknown> | undefined;

/** The link columns the source search filled or changed on the artist's row
 *  (MusicBrainz, the artist's own page, search results), presented the way
 *  discovery presents a profile, so the research view can add them to the
 *  "finding your profiles" cards (docs/research-view.md). A column with no
 *  profile URL to open is left out, as is anything either read failed on. */
export function adoptedProfiles(
    before: Row, after: Row, urlmap: (UrlmapPresentationRow & { siteName: string })[],
): DiscoveredProfile[] {
    if (!before || !after) return [];
    return urlmap.flatMap(row => {
        const value = after[row.siteName];
        if (typeof value !== "string" || !value || value === before[row.siteName]) return [];
        const meta = buildLinkPresentationMeta(row, row.siteName, value);
        if (!meta.profileUrl) return [];
        return [{
            siteName: row.siteName, displayName: meta.displayName, value, profileUrl: meta.profileUrl,
            logoUrl: meta.logoUrl, colorHex: meta.colorHex, previewImage: null, reasoning: null,
            // Found by the search with evidence, not built from the name.
            provisional: false,
        }];
    });
}
