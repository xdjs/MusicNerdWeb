import { normalizePublicUrl } from "@/lib/links/normalizePublicUrl";
import { getArtistById } from "@/server/utils/queries/artistQueries";
import { getVaultSourcesByArtistId, insertVaultSource, updateVaultSourceContent } from "@/server/utils/queries/dashboardQueries";
import { isUnsafeUrl, fetchPageContent } from "@/server/utils/fetchPageContent";
import { fetchLinkPreview } from "@/server/utils/linkPreview";
import { inferTypeFromUrl } from "@/lib/source/sourceTypes";
import { podcastService } from "@/lib/source/podcastService";
import { setArtistLink, clearArtistLink } from "@/server/utils/artistLinkService";
import { contradictsScrapedPosts, handleBelongsToAnotherArtist, nameIsAmbiguousInDirectory } from "@/server/utils/artistIdentityGuards";
import { extractArtistId } from "@/server/utils/services";
import { titleMatchesArtist } from "@/server/utils/profileDiscovery";

/** What applying an artist's profile-card decisions produced, bucketed by what
 *  went wrong — each bucket gets different copy (see the build*Message helpers). */
export interface ProfileLinkOutcome {
    /** siteNames actually written to the artist's row. The auto-build needs
     *  this to tell the vault search which columns hold a discovery GUESS:
     *  intersecting what discovery proposed with what survived the identity
     *  guards, rather than assuming every proposal landed. */
    written: string[];
    /** Recognised as a platform profile and refused because we could not prove
     *  it belongs to this artist. Distinct from `writeRejected`, which is a
     *  database failure — this one is a judgement. */
    identityBlocked: string[];
    unrecognized: string[];
    writeRejected: string[];
    routedToVaultApproved: string[];
    routedToVaultPending: string[];
    vaultInsertFailed: string[];
}

/**
 * Saves the artist's decisions from the profiles card: clear what they removed,
 * add what they kept or pasted, route a non-platform URL to the vault.
 *
 * Shared by `confirm_profiles` AND `find_more_profiles`. That sharing is the
 * point: "Look for more" used to send NO payload, so every confirmation and
 * removal the artist had made was discarded, the card re-rendered from server
 * state, and their own profiles came back as fresh unconfirmed candidates —
 * seen happening to a real artist. The card's own copy promises "leaving a card
 * as-is confirms it", so re-searching has to honour that promise too.
 *
 * Only `confirm_profiles` advances the step; this function never does.
 */
/** Exported so the benchmark can run the same sequence onboarding does —
 *  discover, then write, then search for sources. It used to run only the last
 *  of those and was quoted as the product's score. */
export async function applyProfileLinkDecisions(
    artistId: string,
    addedLinks: { url: string }[],
    removedSiteNames: string[],
    /**
     * Check that each handle really belongs to this artist before writing it.
     *
     * OFF BY DEFAULT, and the default is the point: two of the three callers
     * pass links the ARTIST typed, and an artist adding their own Instagram
     * must not be blocked because somebody with a similar name is also in the
     * directory. Only the auto-build — which writes whatever profile discovery
     * guessed, with nobody looking — turns this on.
     */
    opts?: { verifyIdentity?: boolean },
): Promise<ProfileLinkOutcome> {
    for (const siteName of removedSiteNames) {
        try {
            await clearArtistLink(artistId, siteName);
        } catch (e) {
            console.error(`[onboarding] clearArtistLink failed for ${siteName}:`, e);
        }
    }

    // Bug 3: track the two failure causes separately — a URL we couldn't
    // parse at all (unrecognized) vs. one we parsed fine but whose write
    // was rejected (e.g. a unique-constraint collision) — they get
    // different copy below.
    const unrecognized: string[] = [];
    const writeRejected: string[] = [];
    // A URL that doesn't extract to any platform (an artist's own
    // website, most commonly — urlmap has no generic website platform)
    // routed to the vault instead of rejected. Split by ownership
    // confidence — the two get different copy below (buildRoutedToVault*),
    // since only the approved bucket has any evidence it's the artist's
    // own page.
    const routedToVaultApproved: string[] = [];
    const routedToVaultPending: string[] = [];
    // The write succeeded (recognized fine) but the vault insert itself
    // threw — a real DB failure, not an "unrecognized" link. Distinct
    // bucket so the copy doesn't misreport what actually went wrong.
    const vaultInsertFailed: string[] = [];
    /** Recognised fine, and refused because we could not prove it is theirs. */
    const identityBlocked: string[] = [];
    const written: string[] = [];
    // Only needed for the ownership cross-check below, which no
    // platform-recognized URL ever reaches — fetched at most once, so a
    // turn with no failed-extraction URLs never pays for it.
    let artistName: string | undefined;
    // Idempotency: a reconnect can resubmit the exact same addedLinks
    // (spec §9 — every handler upserts and continues, never double-acts).
    // setArtistLink/clearArtistLink are naturally idempotent (same column,
    // same value); a plain insertVaultSource is not, so URLs already in
    // the vault (from an earlier attempt at this exact turn, or a
    // duplicate paste) are looked up once and skipped rather than
    // re-inserted as a second row.
    let existingVaultStatusByUrl: Map<string, string> | undefined;
    for (const entry of addedLinks) {
        const url = normalizePublicUrl(entry.url);
        if (!url || isUnsafeUrl(url)) { unrecognized.push(entry.url); continue; }
        const raw = { ...entry, url };
        let extracted;
        try {
            extracted = await extractArtistId(raw.url);
        } catch (e) {
            console.error(`[onboarding] extractArtistId failed for ${raw.url}:`, e);
            unrecognized.push(raw.url);
            continue;
        }
        if (!extracted?.siteName || !extracted?.id) {
            // Not a recognized platform profile. Before rejecting it, see
            // if it's a real page we can route to the vault instead — the
            // single best About source an artist can hand us (their own
            // site) has nowhere to go in urlmap and must not be thrown
            // away just because it isn't a platform profile.
            if (isUnsafeUrl(raw.url)) {
                unrecognized.push(raw.url);
                continue;
            }
            if (existingVaultStatusByUrl === undefined) {
                const existing = await getVaultSourcesByArtistId(artistId);
                existingVaultStatusByUrl = new Map(existing.map(s => [s.url, s.status]));
            }
            const existingStatus = existingVaultStatusByUrl.get(raw.url);
            if (existingStatus) {
                // Already routed to the vault (an earlier attempt at this
                // turn, or a duplicate paste) — idempotent no-op, not a
                // fresh insert or a fetch.
                (existingStatus === "approved" ? routedToVaultApproved : routedToVaultPending).push(raw.url);
                continue;
            }
            const preview = await fetchLinkPreview(raw.url);
            if (!preview.title && !preview.imageUrl) {
                // Dead link / no metadata to go on — genuinely unrecognized.
                unrecognized.push(raw.url);
                continue;
            }
            // Resolves to a real page. Confidence on ownership: does the
            // page's own title carry the artist's name? If so, it's
            // authoritative and self-authored — the artist just handed it
            // to us — so approve it outright. Otherwise park it as
            // `pending` for curation at the vault step, same as any other
            // web-found source. Reuses the same name cross-check the
            // handle-probing tier uses (`titleMatchesArtist`) rather than
            // a second matcher.
            if (artistName === undefined) artistName = (await getArtistById(artistId))?.name ?? "";
            const ownedByArtist = !!preview.title && titleMatchesArtist(preview.title, artistName);
            try {
                const source = await insertVaultSource({
                    artistId,
                    url: raw.url,
                    title: preview.title ?? undefined,
                    // `ownedByArtist` means the artist handed us this URL AND
                    // the page's own title carries their name — that is the
                    // artist's official site, so record it as such instead of
                    // discarding the signal. inferTypeFromUrl can't determine
                    // this (a URL alone never says who owns it) and would call
                    // a personal domain an "article", indistinguishable from a
                    // magazine piece about them. The profile surfaces approved
                    // "website" sources beside Links rather than burying them.
                    type: ownedByArtist ? "website" : inferTypeFromUrl(raw.url),
                    status: ownedByArtist ? "approved" : "pending",
                });
                existingVaultStatusByUrl.set(raw.url, ownedByArtist ? "approved" : "pending");
                // Card metadata was already read above. Original text is queued
                // atomically by insertVaultSource; only podcast grouping metadata
                // needs an awaited follow-up in this request.
                if (source?.id && podcastService(raw.url)) {
                    const enrichment = fetchPageContent(raw.url).then(content =>
                        updateVaultSourceContent(source.id, {
                            ...content.podcastEpisode,
                            ...(preview.title ? {} : { title: content.title }),
                            snippet: content.snippet,
                            ogImage: content.ogImage,
                        })
                    ).catch(e => console.error("[onboarding] Content enrichment failed:", e));
                    await enrichment;
                }
                (ownedByArtist ? routedToVaultApproved : routedToVaultPending).push(raw.url);
            } catch (e) {
                console.error(`[onboarding] insertVaultSource failed for ${raw.url}:`, e);
                vaultInsertFailed.push(raw.url);
            }
            continue;
        }
        // THE SAME CHECKS THE VAULT PATH HAS ALWAYS APPLIED. They guarded
        // adoption from a search result and nothing else, so the auto-build —
        // the path every artist takes — wrote whatever discovery guessed. With
        // three Black Daves in this directory, that gave Black Dave another
        // one's Instagram and Black Dave MK2 a third person's. The benchmark
        // could not see it because it never ran this half of the flow.
        if (opts?.verifyIdentity) {
            if (artistName === undefined) artistName = (await getArtistById(artistId))?.name ?? "";
            const blocked =
                await nameIsAmbiguousInDirectory(artistId, artistName)
                || await handleBelongsToAnotherArtist(artistId, extracted.siteName, String(extracted.id))
                || await contradictsScrapedPosts(artistId, extracted.siteName, String(extracted.id));
            if (blocked) {
                console.log(`[onboarding] Not writing ${extracted.siteName}=${extracted.id} — identity checks did not clear it`);
                identityBlocked.push(raw.url);
                continue;
            }
        }
        try {
            await setArtistLink(artistId, extracted.siteName, extracted.id);
            written.push(extracted.siteName);
        } catch (e) {
            console.error(`[onboarding] setArtistLink failed for ${raw.url}:`, e);
            writeRejected.push(raw.url);
        }
    }

    return { unrecognized, writeRejected, routedToVaultApproved, routedToVaultPending, vaultInsertFailed, identityBlocked, written };
}
