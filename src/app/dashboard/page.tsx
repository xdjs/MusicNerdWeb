import { getServerAuthSession } from "@/server/auth";
import { getDevSession } from "@/server/utils/dev-auth";
import { redirect } from "next/navigation";
import { getApprovedClaimByUserId } from "@/server/utils/queries/dashboardQueries";
import { getVaultSourcesByArtistId } from "@/server/utils/queries/dashboardQueries";
import { getSpotifyImage, getSpotifyHeaders } from "@/server/utils/queries/externalApiQueries";
import DashboardContent from "./_components/DashboardContent";

export default async function Dashboard() {
    const session = await getServerAuthSession() ?? await getDevSession();

    if (!session) {
        redirect("/");
    }

    const claim = await getApprovedClaimByUserId(session.user.id);

    if (!claim) {
        return (
            <section className="px-4 sm:px-10 py-5 space-y-6 max-w-[1000px] mx-auto">
                <h1 className="text-3xl font-bold text-center mb-8">Artist Dashboard</h1>
                <div className="bg-white rounded-lg shadow-2xl p-10 text-center space-y-4">
                    <p className="text-lg text-gray-600">
                        You haven&apos;t claimed an artist profile yet.
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Search for your profile and click &quot;Claim Profile&quot; to get started.
                    </p>
                </div>
            </section>
        );
    }

    let spotifyImgUrl = "";
    try {
        const headers = await getSpotifyHeaders();
        const spotifyImg = await getSpotifyImage(claim.artist?.spotify ?? "", undefined, headers);
        spotifyImgUrl = spotifyImg.artistImage;
    } catch {
        // Spotify image fetch failed — use fallback
    }

    const [pendingSources, approvedSources] = await Promise.all([
        getVaultSourcesByArtistId(claim.artistId, "pending"),
        getVaultSourcesByArtistId(claim.artistId, "approved"),
    ]);

    const currentImage = claim.artist?.customImage || spotifyImgUrl || "/default_pfp_pink.png";

    return (
        <section className="px-4 sm:px-10 py-5 space-y-6 max-w-[1000px] mx-auto">
            <h1 className="text-3xl font-bold text-center mb-8">Artist Dashboard</h1>
            <DashboardContent
                artistName={claim.artist?.name ?? "Unknown Artist"}
                artistId={claim.artistId}
                artistImage={currentImage}
                pendingSources={pendingSources}
                approvedSources={approvedSources}
            />
        </section>
    );
}
