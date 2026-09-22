import { discoverArtistProfilesStream, type DiscoveredProfile } from "@/server/utils/profileDiscovery";
import { applyProfileLinkDecisions } from "@/server/utils/onboarding/turnHandlers";

export type DiscoveryWrite = {
    /** Accounts discovery found, across all platforms. */
    found: number;
    /** Second accounts on a platform, offered to an artist as a choice and not scored. */
    alternatives: number;
    /** Platforms written from a name-derived guess, so the source search still covers them. */
    provisionalSiteNames: string[];
    discoveryError: string | null;
};

/**
 * The first half of the flow an artist actually runs: profile discovery, then writing
 * what it found. The order and the calls mirror onboarding's auto-build in
 * `turnHandlers`; if that changes, this has to change with it or the suite stops
 * describing the product. One write per platform (the first account found), with
 * identity verification on, exactly as the auto-build does. A discovery failure is
 * recorded rather than thrown so the case is still scored on what was written.
 */
export async function writeDiscoveredProfiles(artistId: string): Promise<DiscoveryWrite> {
    const discovered: DiscoveredProfile[] = [];
    let discoveryError: string | null = null;
    try {
        for await (const event of discoverArtistProfilesStream(artistId)) {
            if (event.kind === "found") discovered.push(event.profile);
        }
    } catch (error) {
        discoveryError = error instanceof Error ? error.message : String(error);
    }
    if (discovered.length === 0) return { found: 0, alternatives: 0, provisionalSiteNames: [], discoveryError };

    const seenPlatform = new Set<string>();
    const primaries = discovered.filter(profile => {
        if (seenPlatform.has(profile.siteName)) return false;
        seenPlatform.add(profile.siteName);
        return true;
    });
    const outcome = await applyProfileLinkDecisions(artistId, primaries.map(p => ({ url: p.profileUrl })), [], { verifyIdentity: true });
    const wrote = new Set(outcome.written);
    const provisionalSiteNames = [...new Set(primaries.filter(p => p.provisional && wrote.has(p.siteName)).map(p => p.siteName))];
    return { found: discovered.length, alternatives: discovered.length - primaries.length, provisionalSiteNames, discoveryError };
}
