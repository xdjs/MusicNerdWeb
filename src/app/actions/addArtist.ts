"use server"

import { getServerAuthSession } from "@/server/auth";
import { getSpotifyHeaders, getSpotifyArtist } from '@/server/utils/queries/externalApiQueries';
import { getUserById } from '@/server/utils/queries/userQueries';
import { sendDiscordMessage } from '@/server/utils/queries/discord';
import { addArtist as dbAddArtist, type AddArtistResp } from "@/server/utils/queries/artistQueries";

export async function addArtist(spotifyId: string): Promise<AddArtistResp> {
    const session = await getServerAuthSession();

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

        // Get user data if we have a session
        const user = session?.user?.id ? await getUserById(session.user.id) : null;

        const result = await dbAddArtist(spotifyId);

        if (result.status === "success" && user) {
            const userLabel = user.wallet || user.email || user.id || 'unknown';
            await sendDiscordMessage(`${userLabel} added new artist named: ${result.artistName} (Submitted SpotifyId: ${spotifyId})`);
        }

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
