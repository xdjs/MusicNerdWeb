import { Suspense } from "react";
import type { Artist, ArtistVaultSource, UrlMap } from "@/server/db/DbTypes";
import type { ArtistLink } from "@/server/utils/queries/artistQueries";
import { customImageUrl } from "@/lib/artist/artistImage";
import { getListeningLinks } from "@/lib/artist/artistProfileLinks";
import { isRealBio } from "@/lib/bio/bioConstants";
import ArtistLinksGrid from "@/app/_components/ArtistLinksGrid";
import EditModeToggle from "@/app/_components/EditModeToggle";
import AddArtistData from "./AddArtistData";
import ArtistAskSheet from "./ArtistAskSheet";
import ClaimButton from "./ClaimButton";
import HeroSection from "./HeroSection";
import KnowledgeSection from "./KnowledgeSection";
import LatestSection from "./LatestSection";
import OfficialSiteLinks from "./OfficialSiteLinks";
import ProfileSectionNav from "./ProfileSectionNav";
import RevealSection from "./RevealSection";
import VaultSection from "./VaultSection";

/** The artist page's content, hero through the Ask sheet. While a fresh claim's
 *  onboarding runs, the research view takes its place under the app's nav
 *  (docs/research-view.md); the gate hands it back when the build finishes or
 *  is skipped. */
export default function ArtistProfileContent({
    artist, imageUrl, platformImage, artistLinks, approvedSources, pendingSources, urlMapList, addLinkPrefill,
    isClaimed, isClaimedByUser, isPending, isPendingByUser, canEdit, autoApprove,
}: {
    artist: Artist;
    imageUrl: string;
    platformImage: string | null;
    artistLinks: ArtistLink[];
    approvedSources: ArtistVaultSource[];
    pendingSources: ArtistVaultSource[];
    urlMapList: UrlMap[];
    addLinkPrefill?: string;
    isClaimed: boolean;
    isClaimedByUser: boolean;
    isPending: boolean;
    isPendingByUser: boolean;
    canEdit: boolean;
    /** Admin and whitelisted additions are auto-approved UGC, so they appear in
     *  the feed; claim owners keep direct editing (`isClaimedByUser`). */
    autoApprove: boolean;
}) {
    const heroBio = artist.bio && isRealBio(artist.bio) ? artist.bio : null;
    const listenLinks = getListeningLinks(artist, artistLinks, approvedSources);
    return (
        <>
                <HeroSection key={`${artist.id}:${imageUrl}:${artist.headerImagePosition?.y ?? 0}`} imageUrl={imageUrl}
                    initialPosition={artist.headerImagePosition?.imageUrl === imageUrl ? artist.headerImagePosition.y : 0}
                    hasPortrait={!!(customImageUrl(artist.customImage) || platformImage)}
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
                <RevealSection editable id="mn-links" className="glass p-4 sm:p-5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-black dark:text-white text-xl font-bold">Links</h2>
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
                    <ArtistLinksGrid isMonetized={false} artist={artist} availableLinks={urlMapList} canEdit={canEdit} />
                    <OfficialSiteLinks sources={approvedSources} />
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
                    <ArtistLinksGrid isMonetized={true} artist={artist} availableLinks={urlMapList} canEdit={canEdit} />
                </RevealSection>
                <div id="mn-lore">
                    <VaultSection artistId={artist.id} isClaimed={isClaimed} pendingSources={pendingSources} approvedSources={approvedSources} />
                </div>
                <div id="mn-knowledge"><KnowledgeSection artistId={artist.id} /></div>
                <ArtistAskSheet key={artist.id} artistId={artist.id} artistName={artist.name ?? "this artist"} />
        </>
    );
}
