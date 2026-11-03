"use client";

import type { PublicArtistAbout } from '@/lib/bio/types';
import type { ReactNode } from "react";
import type { Artist, ArtistVaultSource, UrlMap } from "@/server/db/DbTypes";
import type { ArtistLink } from "@/server/utils/queries/artistQueries";
import { customImageUrl } from "@/lib/artist/customImageUrl";
import { getProfileLinks, getListeningLinks } from "@/lib/artist/artistProfileLinks";
import { getSourceLinks } from "@/lib/musicLinks/getSourceLinks";
import { isRealBio } from "@/lib/bio/bioConstants";
import ArtistLinksGrid from "@/app/_components/ArtistLinksGrid";
import EditModeToggle from "@/app/_components/EditModeToggle";
import AddArtistData from "./AddArtistData";
import ArtistAskSheet from "./ArtistAskSheet";
import ClaimButton from "./ClaimButton";
import ArtistClaimBadge from "./ArtistClaimBadge";
import HeroSection from "./HeroSection";
import KnowledgeSection from "./KnowledgeSection";
import ProfileSectionNav from "./ProfileSectionNav";
import RevealSection from "./RevealSection";
import ResearchPending from "./onboarding/ResearchPending";
import ResearchNewCount from "./onboarding/ResearchNewCount";
import ResearchEditBoundary from "./onboarding/ResearchEditBoundary";
import VaultSection from "./VaultSection";

/** The artist page's content, hero through the Ask sheet. While a fresh claim's
 *  onboarding runs, research paints it in place: Links, Lore and About show a
 *  loading state until their step is confirmed (docs/research-view.md).
 *  Latest is server-rendered and arrives as a slot. */
export default function ArtistProfileContent({
    interviewAction, latest, artist, publicAbout, imageUrl, platformImage, artistLinks, approvedSources, pendingSources, urlMapList, addLinkPrefill,
    blockedMusicSourceIds = [], isClaimed, isClaimedByUser, isPending, isPendingByUser, canEdit, autoApprove, claimStatusKnown = true, researching = false,
}: {
    interviewAction?: ReactNode;
    /** The Latest section, server-rendered. */
    latest: ReactNode;
    artist: Artist;
    publicAbout?: PublicArtistAbout | null;
    imageUrl: string;
    platformImage: string | null;
    artistLinks: ArtistLink[];
    approvedSources: ArtistVaultSource[];
    blockedMusicSourceIds?: string[];
    pendingSources: ArtistVaultSource[];
    urlMapList: UrlMap[];
    addLinkPrefill?: string;
    isClaimed: boolean;
    claimStatusKnown?: boolean;
    isClaimedByUser: boolean;
    isPending: boolean;
    isPendingByUser: boolean;
    canEdit: boolean;
    /** Admin and whitelisted additions are auto-approved UGC, so they appear in
     *  the feed; claim owners keep direct editing (`isClaimedByUser`). */
    autoApprove: boolean;
    /** Existing server onboarding flag for Ask; editing uses the active build context. */
    researching?: boolean;
}) {
    const heroBio = artist.bio && isRealBio(artist.bio) ? artist.bio : null;
    const profileLinks = [...getProfileLinks(artist, artistLinks, "links"), ...getProfileLinks(artist, artistLinks, "support")];
    const publicLinkSources = approvedSources.filter(source => !blockedMusicSourceIds.includes(source.id));
    const listenLinks = getListeningLinks(artist, artistLinks, publicLinkSources);
    return (
        <ResearchEditBoundary>
                <HeroSection key={artist.id} imageUrl={imageUrl}
                    initialPosition={artist.headerImagePosition?.imageUrl === imageUrl ? artist.headerImagePosition.y : 0}
                    hasPortrait={!!(customImageUrl(artist.customImage) || platformImage)}
                    artistName={artist.name ?? "Artist"} artistId={artist.id}
                    bio={heroBio} publicAbout={publicAbout} listenLinks={listenLinks}
                    statusBadge={claimStatusKnown && <ArtistClaimBadge key={`${artist.id}:${isClaimed}`} isClaimed={isClaimed} />}>
                    <div role="group" aria-label="Manage artist profile" className="flex shrink-0 items-center gap-2">
                        {claimStatusKnown && <ClaimButton
                            artistId={artist.id}
                            isClaimed={isClaimed}
                            isClaimedByUser={isClaimedByUser}
                            isPending={isPending}
                            isPendingByUser={isPendingByUser}
                            compactOnMobile
                        />}
                        {canEdit && <EditModeToggle compactOnMobile />}
                    </div>
                    {interviewAction}
                </HeroSection>

                <ProfileSectionNav key={`sections:${artist.id}`} />

                {latest}

                {/* Listening, social and support links share one destination. */}
                <RevealSection editable id="mn-links" className="glass p-4 sm:p-5 space-y-3 transition-shadow has-[[data-research-new]]:ring-2 has-[[data-research-new]]:ring-highlightpink/70">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5"><h2 className="text-black dark:text-white text-xl font-bold">Links</h2><ResearchNewCount kind="links" keys={profileLinks.map(link => link.siteName)} /></div>
                        <AddArtistData
                            artist={artist}
                            spotifyImg={platformImage ?? ""}
                            availableLinks={urlMapList}
                            isOpenOnLoad={!!addLinkPrefill}
                            prefillUrl={addLinkPrefill}
                            directEdit={isClaimedByUser}
                            autoApprove={autoApprove}
                        />
                    </div>
                    <ResearchPending step="profiles" skeleton="links" label="finding your profiles…" arrivedLabel="Your links are ready">
                        <ArtistLinksGrid supplementalLinks={getSourceLinks(publicLinkSources, profileLinks, "links", approvedSources)} isMonetized={false} hasSupplementalLinks={getSourceLinks(publicLinkSources, profileLinks, "links", approvedSources).length > 0} artist={artist} artistLinks={artistLinks} availableLinks={urlMapList} />
                    </ResearchPending>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-black/10 pt-5 dark:border-white/10">
                        <h3 className="text-black dark:text-white text-base font-semibold">Support the artist</h3>
                        <AddArtistData
                            artist={artist}
                            spotifyImg={platformImage ?? ""}
                            availableLinks={urlMapList}
                            isOpenOnLoad={false}
                            directEdit={isClaimedByUser}
                            autoApprove={autoApprove}
                        />
                    </div>
                    <ArtistLinksGrid supplementalLinks={getSourceLinks(publicLinkSources, profileLinks, "support", approvedSources)} isMonetized={true} hasSupplementalLinks={getSourceLinks(publicLinkSources, profileLinks, "support", approvedSources).length > 0} artist={artist} artistLinks={artistLinks} availableLinks={urlMapList} />
                </RevealSection>
                <div id="mn-lore">
                    <VaultSection artistId={artist.id} isClaimed={isClaimed} autoApprove={autoApprove} pendingSources={pendingSources} approvedSources={approvedSources} />
                </div>
                <div id="mn-knowledge"><KnowledgeSection artistId={artist.id} /></div>
                <ArtistAskSheet key={`ask:${artist.id}`} artistId={artist.id} artistName={artist.name ?? "this artist"} researching={researching} />
        </ResearchEditBoundary>
    );
}
