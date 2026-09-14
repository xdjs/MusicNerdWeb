import { getArtistById, getAllLinks, getArtistLinks } from "@/server/utils/queries/artistQueries";
import { absoluteImageUrl, customImageUrl } from "@/lib/artistImage";
import { musicPlatformData } from "@/server/utils/musicPlatform";
import ArtistLinksGrid from "@/app/_components/ArtistLinksGrid";
import ClaimButton from "./_components/ClaimButton";
import { getServerAuthSession } from "@/server/auth";
import { getDevSession } from "@/server/utils/dev-auth";
import { getUserById } from "@/server/utils/queries/userQueries";
import { getClaimByArtistId } from "@/server/utils/queries/dashboardQueries";
import { notFound } from "next/navigation";
import { EditModeProvider } from "@/app/_components/EditModeContext";
import EditModeToggle from "@/app/_components/EditModeToggle";
import { getListeningLinks } from "@/lib/artistProfileLinks";
import AddArtistData from "@/app/artist/[id]/_components/AddArtistData";
import HeroSection from "./_components/HeroSection";
import ProfileSectionNav from "./_components/ProfileSectionNav";
import VaultSection from "./_components/VaultSection";
import KnowledgeSection from "./_components/KnowledgeSection";
import ArtistAskSheet from "./_components/ArtistAskSheet";
import LatestSection from "./_components/LatestSection";
import { Suspense } from "react";
import RevealSection from "./_components/RevealSection";
import { getVaultSourcesByArtistId } from "@/server/utils/queries/dashboardQueries";
import AutoRefresh from "@/app/_components/AutoRefresh";
import type { Metadata } from "next";
import SeoArtistLinks from "./_components/SeoArtistLinks";
import ArtistJsonLd from "./_components/ArtistJsonLd";
import OfficialSiteLinks from "./_components/OfficialSiteLinks";
import OnboardingGate from "./_components/onboarding/OnboardingGate";
import ProfileTour from "./_components/onboarding/ProfileTour";
import InterviewOffer from "./_components/onboarding/InterviewOffer";
import { currentLoreSummary } from "@/lib/loreSummary";
import { getArtistDoc, getOnboardingState } from "@/server/utils/queries/onboardingQueries";
import { buildCanonicalArtistUrl, parseSupportedArtistUrl } from "@/lib/artistProfileUrl";
import { isRealBio } from "@/lib/bioConstants";

type ArtistProfileProps = {
    params: Promise<{ id: string }>;
    searchParams?: Promise<{ addLink?: string | string[] }>;
}

function getAddLinkPrefill(addLink: string | string[] | undefined): string | undefined {
    if (typeof addLink !== "string") return undefined;

    const parsed = parseSupportedArtistUrl(addLink);
    return parsed ? buildCanonicalArtistUrl(parsed.platform, parsed.id) ?? undefined : undefined;
}

export async function generateMetadata({ params }: ArtistProfileProps): Promise<Metadata> {
    const { id } = await params;
    const artist = await getArtistById(id);

    if (!artist) {
        return {
            title: "Artist Not Found | Music Nerd",
            description: "The requested artist could not be found on Music Nerd.",
        };
    }

    const platformData = await musicPlatformData.getArtist(artist);
    const ownImage = customImageUrl(artist.customImage);
    const imageUrl = ownImage
        ? absoluteImageUrl(ownImage)
        : platformData?.imageUrl || "https://www.musicnerd.xyz/default_pfp_pink.png";
    const artistName = artist.name ?? "Unknown Artist";

    // The artist's own About, when one has been written, rather than the
    // template. "Discover X's social links and streaming profiles on Music
    // Nerd" is the same sentence on every page in the directory: it is what a
    // search result shows, what a shared link previews as, and what an
    // assistant quotes, and it says nothing about the artist. The About is
    // right there and is the best 160 characters we have.
    const description = artist.bio && isRealBio(artist.bio)
        ? summarize(artist.bio)
        : `Discover ${artistName}'s social links and streaming profiles on Music Nerd.`;
    const pageUrl = `https://www.musicnerd.xyz/artist/${id}`;

    return {
        title: `${artistName} | Music Nerd`,
        description,
        alternates: {
            canonical: pageUrl,
            // HOW A MODEL FINDS THE GOOD VERSION. The page is readable, but the
            // markdown at /llms.txt is the same knowledge with every claim
            // carrying a resolved citation and none of the navigation. A
            // crawler that reads this tag fetches that instead, and can cite us
            // rather than paraphrase us.
            types: { "text/markdown": [{ url: `${pageUrl}/llms.txt`, title: `${artistName} — knowledge document` }] },
        },
        openGraph: {
            type: "profile",
            title: `${artistName} | Music Nerd`,
            description,
            url: pageUrl,
            images: [
                {
                    url: imageUrl,
                    width: 640,
                    height: 640,
                    alt: `${artistName} profile image`,
                },
            ],
        },
        twitter: {
            card: "summary_large_image",
            title: `${artistName} | Music Nerd`,
            description,
            images: [imageUrl],
        },
    };
}

/** A description is a couple of sentences, not a bio. Cut on a sentence
 *  boundary when there is one in range; a description that ends mid-clause
 *  reads as broken rather than truncated. */
function summarize(bio: string, max = 300): string {
    const text = bio.trim().replace(/\s+/g, " ");
    if (text.length <= max) return text;
    const cut = text.slice(0, max);
    const lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
    return lastStop > max * 0.5 ? cut.slice(0, lastStop + 1) : `${cut.trimEnd()}…`;
}

export default async function ArtistProfile({ params, searchParams }: ArtistProfileProps) {
    const { id } = await params;
    const resolvedSearchParams = searchParams ? await searchParams : undefined;
    const addLinkPrefill = getAddLinkPrefill(resolvedSearchParams?.addLink);
    const session = await getServerAuthSession() ?? await getDevSession();
    const dbUser = session ? await getUserById(session.user.id) : null;
    const isAdmin = !!dbUser?.isAdmin;

    const artist = await getArtistById(id);
    if (!artist) {
        return notFound();
    }
    // Pending sources are fetched in parallel (indexed lookup) to avoid a serial
    // round-trip for editors; they are only exposed to the client when canEdit.
    const [platformData, urlMapList, existingClaim, approvedSources, pendingSourcesRaw, artistDoc, artistLinks] = await Promise.all([
        musicPlatformData.getArtist(artist),
        getAllLinks(),
        getClaimByArtistId(id),
        getVaultSourcesByArtistId(id, "approved"),
        getVaultSourcesByArtistId(id, "pending"),
        getArtistDoc(id),
        getArtistLinks(artist),
    ]);

    const platformImage = platformData?.imageUrl ?? null;

    const isClaimed = !!existingClaim && existingClaim.status === "approved";
    const isPending = !!existingClaim && existingClaim.status === "pending";
    const isClaimedByUser = isClaimed && !!session && existingClaim.userId === session.user.id;
    const isPendingByUser = isPending && !!session && existingClaim.userId === session.user.id;
    const canEdit = isClaimedByUser || isAdmin;
    // Claim owners keep direct editing, including owners who are also admins.
    // Other admin/whitelisted additions use auto-approved UGC so they appear in the feed.
    const directEditLinks = isClaimedByUser;
    const autoApproveLinkSubmissions = isAdmin || !!dbUser?.isWhiteListed;

    // Onboarding state costs a query — computed ONLY for the approved claimant.
    // getOnboardingState returns null when the confirmed-steps read FAILED (fail
    // CLOSED — spec C1), not just when there's nothing to show. The `onboardingState
    // && ...` gate below already renders neither the takeover nor the banner in
    // that case — never fall back to a default/guessed state here.
    const onboardingState = isClaimedByUser ? await getOnboardingState(id) : null;

    const pendingSources = canEdit ? pendingSourcesRaw : [];

    const imageUrl = customImageUrl(artist.customImage) || platformImage || "/default_pfp_pink.png";

    const heroBio = artist.bio && isRealBio(artist.bio) ? artist.bio : null;
    const listenLinks = getListeningLinks(artist, artistLinks, approvedSources);

    return (
        <>
            <EditModeProvider canEdit={canEdit}>
            <AutoRefresh showLoading={false} />
            <div className="artist-profile w-full max-w-[800px] mx-auto px-4 pt-2 pb-24 space-y-5 sm:pt-5 sm:space-y-6">

                {/* Gated on onboarding being COMPLETE, which is the only state in
                    which a post-build tour makes sense. Without this, a stale
                    "pending" flag from an earlier session started the tour while
                    the build was still running — the artist watched a card say
                    "we drafted your About" over an About that did not exist yet.
                    Note this is the INVERSE of the gate on OnboardingGate below:
                    once complete it stays complete, so unlike that one this
                    cannot be unmounted out from under the tour. */}
                {isClaimedByUser && onboardingState?.complete && <ProfileTour artistId={artist.id} />}

                {/* The only part of onboarding where what lands on the page
                    comes from the artist rather than from research. Gated the
                    same way the tour is — onboarding finished, and their own
                    page — and it decides for itself whether there is anything
                    worth asking about. */}
                {isClaimedByUser && onboardingState?.complete && (
                    <InterviewOffer artistId={artist.id} artistName={artist.name ?? "your"} />
                )}

                {onboardingState && !onboardingState.complete && (
                    <OnboardingGate
                        artistId={artist.id}
                        artistName={artist.name ?? "your profile"}
                        currentStep={onboardingState.currentStep}
                    />
                )}

                <HeroSection key={`${artist.id}:${imageUrl}`} imageUrl={imageUrl}
                    hasPortrait={!!customImageUrl(artist.customImage)}
                    artistName={artist.name ?? "Artist"} artistId={artist.id}
                    bio={heroBio} listenLinks={listenLinks}>
                    <div role="group" aria-label="Manage artist profile" className="flex shrink-0 items-center gap-2">
                        <ClaimButton
                            artistId={artist.id}
                            isClaimed={isClaimed}
                            isClaimedByUser={isClaimedByUser}
                            isPending={isPending}
                            isPendingByUser={isPendingByUser}
                            artistInstagram={artist.instagram}
                            compactOnMobile
                        />
                        {canEdit && <EditModeToggle compactOnMobile />}
                    </div>
                </HeroSection>

                <ProfileSectionNav key={artist.id} />

                <Suspense fallback={<section id="mn-latest" className="glass p-5" aria-busy="true"><h2 className="text-xl font-bold">Latest</h2><p role="status" className="mt-2 text-sm text-muted-foreground">Loading updates…</p></section>}>
                    <LatestSection artist={artist} imageUrl={imageUrl} sources={approvedSources.map(({ url, title }) => ({ url, title }))} listenLinks={listenLinks} />
                </Suspense>

                {/* Listening, social and support links share one destination. */}
                <RevealSection id="mn-links" className="glass p-4 sm:p-5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-black dark:text-white text-xl font-bold">Links</h2>
                        <AddArtistData
                            artist={artist}
                            spotifyImg={platformImage ?? ""}
                            availableLinks={urlMapList}
                            isOpenOnLoad={!!addLinkPrefill}
                            prefillUrl={addLinkPrefill}
                            directEdit={directEditLinks}
                            autoApprove={autoApproveLinkSubmissions}
                        />
                    </div>
                    <ArtistLinksGrid isMonetized={false} artist={artist} availableLinks={urlMapList} canEdit={canEdit} />
                    <OfficialSiteLinks sources={approvedSources} />
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-black/10 pt-5 dark:border-white/10">
                        <h3 className="text-black dark:text-white text-base font-semibold">Support the artist</h3>
                        <AddArtistData
                            artist={artist}
                            spotifyImg={platformImage ?? ""}
                            availableLinks={urlMapList}
                            isOpenOnLoad={false}
                            directEdit={directEditLinks}
                            autoApprove={autoApproveLinkSubmissions}
                        />
                    </div>
                    <ArtistLinksGrid isMonetized={true} artist={artist} availableLinks={urlMapList} canEdit={canEdit} />
                </RevealSection>
                <div id="mn-lore">
                    <VaultSection summary={currentLoreSummary(artistDoc?.loreSummary, approvedSources)} artistId={artist.id} pendingSources={pendingSources} approvedSources={approvedSources} />
                </div>
                <div id="mn-knowledge"><KnowledgeSection artistId={artist.id} /></div>
            </div>
            <ArtistAskSheet key={artist.id} artistId={artist.id} artistName={artist.name ?? "this artist"} />
            </EditModeProvider>
            <SeoArtistLinks artist={artist} />
            <ArtistJsonLd
                artist={artist}
                imageUrl={imageUrl}
                pageUrl={`https://www.musicnerd.xyz/artist/${id}`}
            />
        </>
    );
}
