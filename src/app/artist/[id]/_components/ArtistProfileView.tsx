"use client";

import type { ComponentProps, ReactNode } from "react";
import { EditModeProvider } from "@/app/_components/EditModeContext";
import { useArtistViewer } from "@/hooks/useArtistViewer";
import { useArtistEditor } from "@/hooks/useArtistEditor";
import { useClaimantOnboarding } from "@/hooks/useClaimantOnboarding";
import ArtistProfileContent from "./ArtistProfileContent";
import DirectoryDiscoveryObserver from "./DirectoryDiscoveryObserver";
import OnboardingGate from "./onboarding/OnboardingGate";
import ProfileTour from "./onboarding/ProfileTour";
import ProfileTourPreview from "./onboarding/ProfileTourPreview";
import ApiInterview from "./onboarding/ApiInterview";

type ViewerProps = "isClaimedByUser" | "isPendingByUser" | "canEdit" | "autoApprove" | "pendingSources" | "interviewAction" | "researching";

/**
 * The artist page for whoever is looking. The server renders the public page;
 * here the signed-in caller's role, claim and editor view are read from
 * MusicNerdAPI, so the claimant and admins get edit mode, pending sources and
 * the stored About, and the claimant gets their onboarding build.
 */
export default function ArtistProfileView({ content, tourPreview, hasSupportLinks, researchLinks, watchDirectory, children }: {
    /** The public page; viewer-specific props are filled in here. */
    content: Omit<ComponentProps<typeof ArtistProfileContent>, ViewerProps>;
    tourPreview: boolean;
    hasSupportLinks: boolean;
    /** The links the onboarding build counts new against. */
    researchLinks: string[];
    /** A new, unclaimed artist's link revision, watched for its adder or an admin; null otherwise. */
    watchDirectory: string | null;
    children?: ReactNode;
}) {
    const { artist, isClaimed, isPending } = content;
    const { user, claimStatus, addedByCaller } = useArtistViewer(artist.id);
    const isAdmin = !!user?.isAdmin;
    const isClaimedByUser = isClaimed && claimStatus === "approved";
    const isPendingByUser = isPending && claimStatus === "pending";
    const canEdit = isClaimedByUser || isAdmin;
    const editor = useArtistEditor(artist.id, canEdit);
    const onboardingState = useClaimantOnboarding(artist.id, isClaimedByUser);

    const profile = (
        <ArtistProfileContent
            {...content}
            artist={editor ? { ...artist, bio: editor.bio } : artist}
            approvedSources={editor?.approvedSources ?? content.approvedSources}
            pendingSources={editor?.pendingSources ?? []}
            interviewAction={!tourPreview && isClaimedByUser && onboardingState?.complete
                ? <ApiInterview key={`${artist.id}:${user?.id}`} artistId={artist.id} artistName={artist.name ?? "your"} />
                : null}
            isClaimedByUser={isClaimedByUser}
            isPendingByUser={isPendingByUser}
            canEdit={canEdit}
            autoApprove={isAdmin || !!user?.isWhiteListed}
            researching={!tourPreview && onboardingState?.complete === false}
        />
    );

    return (
        <EditModeProvider canEdit={canEdit}>
            {children}
            {watchDirectory !== null && (isAdmin || addedByCaller) && <DirectoryDiscoveryObserver key={artist.id} artistId={artist.id} initialRevision={watchDirectory} />}
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
                ) : isClaimedByUser && onboardingState?.complete && (
                    <ProfileTour key={artist.id} artistId={artist.id} hasSupportLinks={hasSupportLinks} />
                )}

                {/* The artist page. While a fresh claim's onboarding runs, research
                    paints it in place, section by section (docs/research-view.md). The
                    gate is rendered for the claimant whatever the state, so a build
                    that completes during the visit keeps its ready card and new-item
                    marks; a page that arrives complete renders just the profile. */}
                {!tourPreview && onboardingState ? (
                    <OnboardingGate
                        artistId={artist.id}
                        state={onboardingState}
                        researchItems={{ links: researchLinks, sources: content.approvedSources.map(source => source.id) }}
                    >
                        {profile}
                    </OnboardingGate>
                ) : profile}
            </div>
        </EditModeProvider>
    );
}
