import type { Score } from "@/lib/evals/Score";

type LinkPlacementMetadata = { placed: string[]; missing: string[]; inLore: string[] };

/**
 * #1273: a verified artist-profile URL discovered during research belongs in Links,
 * not in Lore. `expectedProfiles` are the profile URLs the case knows are the
 * artist's; `links` are the profile URLs research stored as Links; `loreProfiles` are
 * the profile-typed sources it stored in Lore.
 *
 * Score is the fraction of expected profiles that ended up in Links, and 0 if anything
 * profile-typed is sitting in Lore, whatever else went right. URLs match ignoring
 * scheme, `www.`, trailing slash, query and case; an Apple Music or Beatport artist
 * URL also matches with or without its name slug, since the numeric id is the identity.
 */
export function scoreLinkPlacement(input: {
    links: string[];
    loreProfiles: string[];
    expectedProfiles: string[];
}): Score<LinkPlacementMetadata> {
    const links = new Set(input.links.map(canonical));
    const placed = input.expectedProfiles.filter(u => links.has(canonical(u)));
    const missing = input.expectedProfiles.filter(u => !links.has(canonical(u)));
    const inLore = input.loreProfiles;
    const fraction = input.expectedProfiles.length === 0 ? 1 : placed.length / input.expectedProfiles.length;
    return {
        name: "link_placement",
        score: inLore.length > 0 ? 0 : fraction,
        metadata: { placed, missing, inLore },
    };
}

function canonical(url: string): string {
    return url
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .replace(/[?#].*$/, "")
        .replace(/\/+$/, "")
        // music.apple.com/us/artist/pete-rango/1513734272 → music.apple.com/us/artist/1513734272
        .replace(/^(music\.apple\.com\/[a-z]{2}\/artist\/)[^/]+\/(\d+)$/, "$1$2")
        // beatport.com/artist/pete-rango/12345 → beatport.com/artist/12345
        .replace(/^(beatport\.com\/artist\/)[^/]+\/(\d+)$/, "$1$2");
}
