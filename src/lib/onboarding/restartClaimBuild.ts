import { musicNerdApiUrl } from "@/lib/musicNerdApi/musicNerdApiUrl";

/**
 * Restarts the claimed artist's page build on MusicNerdAPI. It resumes at the
 * first unconfirmed step, and a build already running is left alone.
 *
 * @param artistId - The artist.
 * @param token - The claimant's (or an admin's) Privy access token.
 * @returns Whether the API accepted it.
 */
export async function restartClaimBuild(artistId: string, token: string): Promise<boolean> {
    try {
        const res = await fetch(musicNerdApiUrl(`/api/onboarding/${artistId}/build`), {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.ok;
    } catch {
        return false;
    }
}
