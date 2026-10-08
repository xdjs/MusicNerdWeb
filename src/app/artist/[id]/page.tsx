import GuidedDemo from './_components/GuidedDemo';
import { getConflictingMusicSourceIds } from "@/server/utils/musicLinks/getConflictingMusicSourceIds";
import { addSourceContributors } from "@/server/utils/source/addSourceContributors";
import { getArtistById, getAllLinks, getArtistLinks } from "@/server/utils/queries/artistQueries";
import { absoluteImageUrl } from "@/lib/artist/absoluteImageUrl";
import { customImageUrl } from "@/lib/artist/customImageUrl";
import { musicPlatformData } from "@/server/utils/musicPlatform";
import { getServerAuthSession } from "@/server/auth";
import { getDevSession } from "@/server/utils/dev-auth";
import { getUserById } from "@/server/utils/queries/userQueries";
import { getClaimByArtistId } from "@/server/utils/queries/dashboardQueries";
import { notFound } from "next/navigation";
import { EditModeProvider } from "@/app/_components/EditModeContext";
import OutboundClickTracker from "./_components/OutboundClickTracker";
import ArtistProfileContent from "./_components/ArtistProfileContent";
import { getVaultSourcesByArtistId } from "@/server/utils/queries/dashboardQueries";
import AutoRefresh from "@/app/_components/AutoRefresh";
import type { Metadata } from "next";
import SeoArtistLinks from "./_components/SeoArtistLinks";
import ArtistJsonLd from "./_components/ArtistJsonLd";
import OnboardingGate from "./_components/onboarding/OnboardingGate";
import ProfileTour from "./_components/onboarding/ProfileTour";
import { isInterviewPreviewEnabled } from "@/lib/interview/isInterviewPreviewEnabled";
import InterviewPreview from "@/app/dev/interview-preview/InterviewPreview";
import InterviewOffer from "./_components/onboarding/InterviewOffer";
import ApiInterview from "./_components/onboarding/ApiInterview";
import { MUSICNERD_API_INTERVIEWER_ENABLED } from "@/env";
import { fetchOnboardingState } from "@/server/utils/onboarding/fetchOnboardingState";
import { buildCanonicalArtistUrl, parseSupportedArtistUrl } from "@/lib/artist/artistProfileUrl";
import { isRealBio } from "@/lib/bio/bioConstants";
import { getProfileLinks } from "@/lib/artist/artistProfileLinks";
import { getSourceLinks } from "@/lib/musicLinks/getSourceLinks";
import ProfileTourPreview from "./_components/onboarding/ProfileTourPreview";

type ArtistProfileProps = {
    params: Promise<{ id: string }>;
    searchParams?: Promise<{ addLink?: string | string[]; interviewPreview?: string; tourPreview?: string; guidedDemo?: string }>;
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

    const platformImage = await musicPlatformData.getArtistPortrait(artist);
    const ownImage = customImageUrl(artist.customImage);
    const imageUrl = ownImage
        ? absoluteImageUrl(ownImage)
        : platformImage || "https://musicnerd.net/default_pfp_pink.png";
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
    const pageUrl = `https://musicnerd.net/artist/${id}`;

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
    const interviewPreview = isInterviewPreviewEnabled() && resolvedSearchParams?.interviewPreview === "1";
    const tourPreview = (process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'preview')
        && resolvedSearchParams?.tourPreview === "1";
    const guidedDemo = (process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'preview') && resolvedSearchParams?.guidedDemo === '1';
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
    const [platformImage, urlMapList, existingClaim, approvedSources, pendingSourcesRaw, artistLinks] = await Promise.all([
        musicPlatformData.getArtistPortrait(artist),
        getAllLinks(),
        getClaimByArtistId(id),
        getVaultSourcesByArtistId(id, "approved"),
        getVaultSourcesByArtistId(id, "pending"),
        getArtistLinks(artist),
    ]);

    const blockedMusicSourceIds = await getConflictingMusicSourceIds(id, approvedSources);
    const hasSupportLinks = getProfileLinks(artist, artistLinks, 'support').length > 0
        || getSourceLinks(
            approvedSources.filter(source => !blockedMusicSourceIds.includes(source.id)),
            [],
            'support',
        ).length > 0;

    const isClaimed = !!existingClaim && existingClaim.status === "approved";
    const isPending = !!existingClaim && existingClaim.status === "pending";
    const isClaimedByUser = isClaimed && !!session && existingClaim.userId === session.user.id;
    const isPendingByUser = isPending && !!session && existingClaim.userId === session.user.id;
    const canEdit = isClaimedByUser || isAdmin;

    // Resolve contributor display names only for authorized reviewers, never visitors.
    const editorSources = canEdit
        ? await addSourceContributors(id, [...approvedSources, ...pendingSourcesRaw])
        : [];
    const editorApproved = editorSources.slice(0, approvedSources.length);
    const editorPending = editorSources.slice(approvedSources.length);

    // Onboarding state costs a request to MusicNerdAPI — made ONLY for the
    // approved claimant (docs/research-view.md). fetchOnboardingState returns null
    // when the state can't be read (fail CLOSED — spec C1), not just when there's
    // nothing to show. The gate below renders neither the takeover nor the banner
    // in that case — never fall back to a default/guessed state here.
    const onboardingState = isClaimedByUser ? await fetchOnboardingState(id) : null;

    const imageUrl = customImageUrl(artist.customImage) || platformImage || "/default_pfp_pink.png";

    const profile = (
        <ArtistProfileContent
            artist={artist}
            claimStatusKnown={existingClaim !== undefined}
            imageUrl={imageUrl}
            platformImage={platformImage}
            artistLinks={artistLinks}
            blockedMusicSourceIds={blockedMusicSourceIds}
            approvedSources={canEdit ? editorApproved : approvedSources}
            pendingSources={editorPending}
            urlMapList={urlMapList}
            addLinkPrefill={addLinkPrefill}
            isClaimed={isClaimed}
            isClaimedByUser={isClaimedByUser}
            isPending={isPending}
            isPendingByUser={isPendingByUser}
            canEdit={canEdit}
            autoApprove={isAdmin || !!dbUser?.isWhiteListed}
        />
    );

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
                {tourPreview ? (
                    <ProfileTourPreview key={artist.id} artistId={artist.id} hasSupportLinks={hasSupportLinks} />
                ) : !interviewPreview && isClaimedByUser && onboardingState?.complete && (
                    <ProfileTour key={artist.id} artistId={artist.id} hasSupportLinks={hasSupportLinks} />
                )}

                {/* The only part of onboarding where what lands on the page
                    comes from the artist rather than from research. Gated the
                    same way the tour is — onboarding finished, and their own
                    page — and it decides for itself whether there is anything
                    worth asking about. */}
                {interviewPreview ? <InterviewPreview key={artist.id} artistId={artist.id} artistName={artist.name ?? "your"} /> : !tourPreview && isClaimedByUser && onboardingState?.complete && (
                    MUSICNERD_API_INTERVIEWER_ENABLED ? <ApiInterview key={`${artist.id}:${session?.user.id ?? "anonymous"}`} artistId={artist.id} artistName={artist.name ?? "your"} /> : <InterviewOffer key={`${artist.id}:${session?.user.id ?? "anonymous"}`} artistId={artist.id} artistName={artist.name ?? "your"} />
                )}

                {/* The artist page. While a fresh claim's onboarding runs, research
                    paints it in place, section by section (docs/research-view.md). The
                    gate is rendered for the claimant whatever the state, so a build
                    that completes during the visit keeps its ready card and new-item
                    marks; a page that arrives complete renders just the profile. */}
                {!interviewPreview && !tourPreview && onboardingState ? (
                    <OnboardingGate
                        artistId={artist.id}
                        artistName={artist.name ?? "your profile"}
                        state={onboardingState}
                        researchItems={{
                            links: [...getProfileLinks(artist, artistLinks, 'links'), ...getProfileLinks(artist, artistLinks, 'support')].map(link => link.siteName),
                            sources: approvedSources.map(source => source.id),
                        }}
                    >
                        {profile}
                    </OnboardingGate>
                ) : profile}
            </div>
            {guidedDemo && <GuidedDemo />}
            <OutboundClickTracker />
            </EditModeProvider>
            <SeoArtistLinks artist={artist} />
            <ArtistJsonLd
                artist={artist}
                imageUrl={imageUrl}
                pageUrl={`https://musicnerd.net/artist/${id}`}
            />
        </>
    );
}
