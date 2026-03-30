import { getServerAuthSession } from "@/server/auth";
import { getDevSession } from "@/server/utils/dev-auth";
import { redirect } from "next/navigation";
import { getApprovedClaimByUserId, getPendingClaimByUserId } from "@/server/utils/queries/dashboardQueries";
import { getVaultSourcesByArtistId } from "@/server/utils/queries/dashboardQueries";
import { getSpotifyImage, getSpotifyHeaders } from "@/server/utils/queries/externalApiQueries";
import { getArtistLinks, getAllLinks } from "@/server/utils/queries/artistQueries";
import { getArtistById } from "@/server/utils/queries/artistQueries";
import DashboardContent from "./_components/DashboardContent";

export default async function Dashboard() {
    const session = await getServerAuthSession() ?? await getDevSession();

    if (!session) {
        redirect("/");
    }

    const claim = await getApprovedClaimByUserId(session.user.id);

    if (!claim) {
        // Check for pending claim
        const pendingClaim = await getPendingClaimByUserId(session.user.id);

        if (pendingClaim) {
            return (
                <section className="px-4 py-5 space-y-6 max-w-[800px] mx-auto">
                    <h1 className="text-3xl font-bold text-center mb-8">Artist Dashboard</h1>
                    <div className="glass p-10 text-center space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/15 text-amber-500 text-sm font-semibold">
                            Pending Verification
                        </div>
                        <p className="text-lg text-gray-600 dark:text-gray-300">
                            Your claim for <strong>{pendingClaim.artist?.name ?? "this artist"}</strong> is pending verification.
                        </p>
                        {pendingClaim.referenceCode && (
                            <div className="inline-block px-6 py-3 rounded-lg bg-muted">
                                <p className="text-xs text-muted-foreground mb-1">Your reference code</p>
                                <p className="text-2xl font-mono font-bold tracking-wider">
                                    {pendingClaim.referenceCode}
                                </p>
                            </div>
                        )}
                        <p className="text-sm text-muted-foreground">
                            DM <strong>@musicnerdxyz</strong> on Instagram from your official artist account with this code to complete verification.
                        </p>
                        <a
                            href="https://www.instagram.com/musicnerdxyz/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-pastypink hover:underline text-sm font-medium"
                        >
                            Open @musicnerdxyz on Instagram
                        </a>
                    </div>
                </section>
            );
        }

        return (
            <section className="px-4 py-5 space-y-6 max-w-[800px] mx-auto">
                <h1 className="text-3xl font-bold text-center mb-8">Artist Dashboard</h1>
                <div className="glass p-10 text-center space-y-4">
                    <p className="text-lg text-gray-600 dark:text-gray-300">
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

    const artist = await getArtistById(claim.artistId);

    const [pendingSources, approvedSources, artistLinks, availableLinks] = await Promise.all([
        getVaultSourcesByArtistId(claim.artistId, "pending"),
        getVaultSourcesByArtistId(claim.artistId, "approved"),
        artist ? getArtistLinks(artist) : Promise.resolve([]),
        getAllLinks(),
    ]);

    const currentImage = claim.artist?.customImage || spotifyImgUrl || "/default_pfp_pink.png";

    return (
        <section className="px-4 lg:px-8 py-5 space-y-6 max-w-[1200px] mx-auto">
            <DashboardContent
                artistName={claim.artist?.name ?? "Unknown Artist"}
                artistId={claim.artistId}
                artistImage={currentImage}
                artistSpotify={artist?.spotify ?? null}
                pendingSources={pendingSources}
                approvedSources={approvedSources}
                artistLinks={artistLinks}
                availableLinks={availableLinks}
            />
        </section>
    );
}
