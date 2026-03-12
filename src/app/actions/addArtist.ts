"use server"

import { getServerAuthSession } from "@/server/auth";
import { getDevSession } from "@/server/utils/dev-auth";
import { getSpotifyHeaders, getSpotifyArtist } from '@/server/utils/queries/externalApiQueries';
import { addArtist as dbAddArtist, type AddArtistResp } from "@/server/utils/queries/artistQueries";

export async function addArtist(spotifyId: string): Promise<AddArtistResp> {
    const session = await getServerAuthSession() ?? await getDevSession();

    if (!session) {
        throw new Error("Not authenticated");
    }

    try {
        const headers = await getSpotifyHeaders();
        if (!headers?.headers?.Authorization) {
            return { status: "error", message: "Failed to authenticate with Spotify" };
        }

        const spotifyArtist = await getSpotifyArtist(spotifyId, headers);

        if (spotifyArtist.error) {
            return { status: "error", message: spotifyArtist.error };
        }

        if (!spotifyArtist.data?.name) {
            return { status: "error", message: "Invalid artist data received from Spotify" };
        }

        const result = await dbAddArtist(spotifyId);

        return result;
    } catch (e) {
        console.error("[addArtist] Error:", e);
        if (e instanceof Error) {
            if (e.message.includes('auth')) {
                return { status: "error", message: "Please log in to add artists" };
            }
            if (e.message.includes('duplicate')) {
                return { status: "error", message: "This artist is already in our database" };
            }
        }
        return { status: "error", message: "Something went wrong on our end, please try again" };
    }
}
