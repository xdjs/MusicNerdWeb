import { getPublicArtistAbout } from '@/server/utils/bio/getPublicArtistAbout';
import { publicLinkRevision } from "@/server/utils/directoryDiscovery/publicLinkRevision";
import { projectUnclaimedProfile } from '@/lib/artist/projectUnclaimedProfile';
import { getLoreClaimGeneration } from '@/server/utils/queries/lorePersistence';
import { getHiddenLinkSourceIds } from "@/server/utils/artistLinkReview/getHiddenLinkSourceIds";
import { getConflictingMusicSourceIds } from "@/server/utils/musicLinks/getConflictingMusicSourceIds";
import { getArtistById, getAllLinks, getArtistLinks } from "@/server/utils/queries/artistQueries";
import { customImageUrl } from "@/lib/artist/customImageUrl";
import { musicPlatformData } from "@/server/utils/musicPlatform";
import { getClaimByArtistId } from "@/server/utils/queries/dashboardQueries";
import { notFound } from "next/navigation";
import OutboundClickTracker from "./_components/OutboundClickTracker";
import { getVaultSourcesByArtistId } from "@/server/utils/queries/dashboardQueries";
import { Suspense } from "react";
import ArtistProfileView from "./_components/ArtistProfileView";
import LatestSection from "./_components/LatestSection";
import { getListeningLinks } from "@/lib/artist/artistProfileLinks";
import AutoRefresh from "@/app/_components/AutoRefresh";
import type { Metadata } from "next";
import SeoArtistLinks from "./_components/SeoArtistLinks";
import ArtistJsonLd from "./_components/ArtistJsonLd";
import { buildCanonicalArtistUrl, parseSupportedArtistUrl } from "@/lib/artist/artistProfileUrl";
import { isRealBio } from "@/lib/bio/bioConstants";
import { getProfileLinks } from "@/lib/artist/artistProfileLinks";
import { getSourceLinks } from "@/lib/musicLinks/getSourceLinks";

type ArtistProfileProps = {
    params: Promise<{ id: string }>;
    searchParams?: Promise<{ addLink?: string | string[]; tourPreview?: string }>;
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

    const imageOrigin = process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}` : 'https://musicnerd.net';
    const imageUrl = `${imageOrigin}/artist/${encodeURIComponent(id)}/share-image?v=3`;
    const artistName = artist.name ?? "Unknown Artist";

    // The artist's own About, when one has been written, rather than the
    // template. "Discover X's social links and streaming profiles on Music
    // Nerd" is the same sentence on every page in the directory: it is what a
    // search result shows, what a shared link previews as, and what an
    // assistant quotes, and it says nothing about the artist. The About is
    // right there and is the best 160 characters we have.
    const publicClaim = await getLoreClaimGeneration(id);
    const directoryAbout = publicClaim ? null : await getPublicArtistAbout(id);
    const publicBio = publicClaim && isRealBio(artist.bio) ? artist.bio : directoryAbout?.bio;
    const description = publicBio
        ? summarize(publicBio)
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
                    width: 1200,
                    height: 630,
                    alt: `${artistName} on Music Nerd`,
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
    const tourPreview = (process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'preview')
        && resolvedSearchParams?.tourPreview === "1";
    const addLinkPrefill = getAddLinkPrefill(resolvedSearchParams?.addLink);

    const artist = await getArtistById(id);
    if (!artist) {
        return notFound();
    }
    const [platformImage, urlMapList, existingClaim, approvedSources, artistLinks] = await Promise.all([
        musicPlatformData.getArtistPortrait(artist),
        getAllLinks(),
        getClaimByArtistId(id),
        getVaultSourcesByArtistId(id, "approved"),
        getArtistLinks(artist),
    ]);

    const [conflictingMusicSourceIds, hiddenLinkSourceIds] = await Promise.all([getConflictingMusicSourceIds(id, approvedSources), getHiddenLinkSourceIds(id)]);
    const blockedMusicSourceIds = [...conflictingMusicSourceIds, ...hiddenLinkSourceIds];
    const hasSupportLinks = getProfileLinks(artist, artistLinks, 'support').length > 0
        || getSourceLinks(
            approvedSources.filter(source => !blockedMusicSourceIds.includes(source.id)),
            [],
            'support',
        ).length > 0;

    const isClaimed = !!existingClaim && existingClaim.status === "approved";
    const isPending = !!existingClaim && existingClaim.status === "pending";
    const directoryAbout = isClaimed ? null : await getPublicArtistAbout(id);
    // The public page. The claimant and admins get the stored About and every
    // source from MusicNerdAPI on the client (ArtistProfileView).
    const publicProfile = isClaimed ? { artist, sources: approvedSources } : projectUnclaimedProfile(artist, approvedSources, directoryAbout);

    // A new artist's directory is watched for its adder or an admin while it is
    // unclaimed and less than a day old; ArtistProfileView decides who.
    const createdAt = artist.createdAt ? Date.parse(artist.createdAt) : NaN;
    const watchDirectory = !existingClaim && createdAt <= Date.now() && Date.now() - createdAt < 24 * 60 * 60_000
        ? publicLinkRevision(artist, artistLinks, approvedSources, blockedMusicSourceIds) : null;

    const imageUrl = customImageUrl(artist.customImage) || platformImage || "/default_pfp_pink.png";
    const profileLinks = [...getProfileLinks(artist, artistLinks, "links"), ...getProfileLinks(artist, artistLinks, "support")];
    const publicLinkSources = publicProfile.sources.filter(source => !blockedMusicSourceIds.includes(source.id));

    return (
        <>
            <ArtistProfileView
                tourPreview={tourPreview}
                hasSupportLinks={hasSupportLinks}
                researchLinks={profileLinks.map(link => link.siteName)}
                watchDirectory={watchDirectory}
                content={{
                    publicAbout: directoryAbout,
                    artist: publicProfile.artist,
                    claimStatusKnown: existingClaim !== undefined,
                    imageUrl,
                    platformImage,
                    artistLinks,
                    blockedMusicSourceIds,
                    approvedSources: publicProfile.sources,
                    urlMapList,
                    addLinkPrefill,
                    isClaimed,
                    isPending,
                    latest: (
                        <Suspense fallback={<section id="mn-latest" className="glass p-5" aria-busy="true"><h2 className="text-xl font-bold">Latest</h2><p role="status" className="mt-2 text-sm text-muted-foreground">Loading updates…</p></section>}>
                            <LatestSection artist={publicProfile.artist} imageUrl={imageUrl} sources={publicProfile.sources.map(({ url, title }) => ({ url, title }))} listenLinks={getListeningLinks(artist, artistLinks, publicLinkSources)} />
                        </Suspense>
                    ),
                }}
            >
                <AutoRefresh showLoading={false} />
                <OutboundClickTracker />
            </ArtistProfileView>
            <SeoArtistLinks artist={artist} />
            <ArtistJsonLd
                artist={publicProfile.artist}
                imageUrl={imageUrl}
                pageUrl={`https://musicnerd.net/artist/${id}`}
            />
        </>
    );
}
