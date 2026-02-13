import { Suspense } from "react";
import { getServerAuthSession } from "@/server/auth";
import { redirect } from "next/navigation";
import { getSpotifyHeaders, getSpotifyArtist } from "@/server/utils/queries/externalApiQueries";
import AddArtistContent from "./_components/AddArtistContent";

export default async function AddArtistPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
    const session = await getServerAuthSession();
    if (!session) {
        redirect('/');
    }

    const params = await searchParams;
    const spotifyId = params.spotify;

    if (!spotifyId) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <div className="text-xl">No Spotify ID provided</div>
            </div>
        );
    }

    const headers = await getSpotifyHeaders();
    const response = await getSpotifyArtist(spotifyId, headers);

    if (response.error || !response.data) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <div className="text-red-500 text-xl">{response.error || "Failed to fetch artist data"}</div>
            </div>
        );
    }

    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-gray-900"></div>
            </div>
        }>
            <AddArtistContent initialArtist={response.data} />
        </Suspense>
    );
}
