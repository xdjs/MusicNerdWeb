import { getArtistById, getAllLinks } from "@/server/utils/queries/artistQueries";
import { getSpotifyImage, getSpotifyHeaders, getNumberOfSpotifyReleases } from "@/server/utils/queries/externalApiQueries";
import ArtistLinksGrid from "@/app/_components/ArtistLinksGrid";
import BookmarkButton from "@/app/_components/BookmarkButton";
import ClaimButton from "./_components/ClaimButton";
import { getArtistDetailsText } from "@/server/utils/services";
import { getServerAuthSession } from "@/server/auth";
import { getDevSession } from "@/server/utils/dev-auth";
import { getClaimByArtistId } from "@/server/utils/queries/dashboardQueries";
import { notFound } from "next/navigation";
import { EditModeProvider } from "@/app/_components/EditModeContext";
import EditModeToggle from "@/app/_components/EditModeToggle";
import BlurbSection from "./_components/BlurbSection";
import AddArtistData from "@/app/artist/[id]/_components/AddArtistData";
import HeroSection from "./_components/HeroSection";
// import FunFacts from "./_components/FunFacts";
// import GrapevineIframe from "./_components/GrapevineIframe";
import PressAndFeatures from "./_components/PressAndFeatures";
import AskAboutArtist from "./_components/AskAboutArtist";
import { getVaultSourcesByArtistId } from "@/server/utils/queries/dashboardQueries";
import AutoRefresh from "@/app/_components/AutoRefresh";
import type { Metadata } from "next";
import SeoArtistLinks from "./_components/SeoArtistLinks";

type ArtistProfileProps = {
    params: Promise<{ id: string }>;
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

    const headers = await getSpotifyHeaders();
    const spotifyImg = await getSpotifyImage(artist.spotify ?? "", undefined, headers);
    const imageUrl = artist.customImage
        ? `https://www.musicnerd.xyz${artist.customImage}`
        : spotifyImg.artistImage || "https://www.musicnerd.xyz/default_pfp_pink.png";
    const artistName = artist.name ?? "Unknown Artist";

    return {
        title: `${artistName} | Music Nerd`,
        description: `Discover ${artistName}'s social links and streaming profiles on Music Nerd.`,
        openGraph: {
            type: "profile",
            title: `${artistName} | Music Nerd`,
            description: `Discover ${artistName}'s social links and streaming profiles on Music Nerd.`,
            url: `https://www.musicnerd.xyz/artist/${id}`,
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
            description: `Discover ${artistName}'s social links and streaming profiles on Music Nerd.`,
            images: [imageUrl],
        },
    };
}

export default async function ArtistProfile({ params }: ArtistProfileProps) {
    const { id } = await params;
    const session = await getServerAuthSession() ?? await getDevSession();
    const canEdit = !!session;

    const artist = await getArtistById(id);
    if (!artist) {
        return notFound();
    }
    const headers = await getSpotifyHeaders();

    const [spotifyImg, numReleases, urlMapList, existingClaim, approvedSources] = await Promise.all([
        getSpotifyImage(artist.spotify ?? "", undefined, headers),
        getNumberOfSpotifyReleases(artist.spotify ?? "", headers),
        getAllLinks(),
        getClaimByArtistId(id),
        getVaultSourcesByArtistId(id, "approved"),
    ]);

    const isClaimed = !!existingClaim && existingClaim.status === "approved";
    const isClaimedByUser = isClaimed && !!session && existingClaim.userId === session.user.id;

    const imageUrl = artist.customImage || spotifyImg.artistImage || "/default_pfp_pink.png";

    return (
        <>
            <EditModeProvider canEdit={canEdit}>
            <AutoRefresh showLoading={false} />
            <div className="max-w-[800px] mx-auto px-4 py-5 space-y-6">

                {/* 1. Hero Section */}
                <HeroSection imageUrl={imageUrl} artistName={artist.name ?? "Artist"} />

                {/* 2. Name + Actions */}
                <div className="text-center space-y-2">
                    <h1 className="text-black dark:text-white text-2xl font-bold">
                        {artist.name}
                    </h1>
                    <div className="text-black dark:text-gray-300 text-sm">
                        {artist && getArtistDetailsText(artist, numReleases)}
                    </div>
                    <div className="flex justify-center gap-2 pt-1">
                        <ClaimButton
                            artistId={artist.id}
                            isClaimed={isClaimed}
                            isClaimedByUser={isClaimedByUser}
                        />
                        {session && (
                            <BookmarkButton
                                artistId={artist.id}
                                artistName={artist.name ?? ''}
                                imageUrl={spotifyImg.artistImage ?? ''}
                                userId={session.user.id}
                            />
                        )}
                        {canEdit && <EditModeToggle />}
                    </div>
                </div>

                {/* 3. Bio */}
                <section className="glass p-5">
                    <BlurbSection
                        key={artist.bio ?? ""}
                        artistName={artist.name ?? ""}
                        artistId={artist.id}
                        initialBio={artist.bio ?? null}
                    />
                </section>

                {/* 4. Ask About Artist (AI Q&A) */}
                <section className="glass p-5 space-y-3">
                    <h2 className="text-black dark:text-white text-xl font-bold">Ask About {artist.name}</h2>
                    <AskAboutArtist artistId={artist.id} artistName={artist.name ?? "this artist"} />
                </section>

                {/* 5. Social Links (icon grid) */}
                <section className="glass p-5 space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-black dark:text-white text-xl font-bold">Social Links</h2>
                        <AddArtistData
                            artist={artist}
                            spotifyImg={spotifyImg.artistImage ?? ""}
                            availableLinks={urlMapList}
                            isOpenOnLoad={false}
                        />
                    </div>
                    <ArtistLinksGrid isMonetized={false} artist={artist} availableLinks={urlMapList} />
                </section>

                {/* 6. Support the Artist (icon grid) */}
                <section className="glass p-5 space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-black dark:text-white text-xl font-bold">Support the Artist</h2>
                        <AddArtistData
                            artist={artist}
                            spotifyImg={spotifyImg.artistImage ?? ""}
                            availableLinks={urlMapList}
                            isOpenOnLoad={false}
                        />
                    </div>
                    <ArtistLinksGrid isMonetized={true} artist={artist} availableLinks={urlMapList} />
                </section>

                {/* 7. Press & Features (vault sources) */}
                {approvedSources.length > 0 && (
                    <section className="glass p-5 space-y-3">
                        <h2 className="text-black dark:text-white text-xl font-bold">Press & Features</h2>
                        <PressAndFeatures sources={approvedSources} artistName={artist.name ?? ""} />
                    </section>
                )}

                {/* Old Fun Facts — preserved but hidden (replaced by Ask About section) */}
                {/* <section className="glass p-5 space-y-3">
                    <h2 className="text-black dark:text-white text-xl font-bold">Fun Facts</h2>
                    <FunFacts artistId={artist.id} />
                </section> */}

                {/* 7. Grapevine — hidden until configured */}
                {/* <section className="glass p-5 space-y-3">
                    <h2 className="text-black dark:text-white text-xl font-bold">Grapevine</h2>
                    <GrapevineIframe artistId={artist.id} />
                </section> */}

            </div>
            </EditModeProvider>
            {/* SEO-only links rendered outside client boundary for crawler visibility */}
            <SeoArtistLinks artist={artist} />
        </>
    );
}
