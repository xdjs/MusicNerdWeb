import { callResearchApi } from "@/server/utils/questionResearch/callResearchApi";

/**
 * Starts the claimed artist's page build on MusicNerdAPI, which runs it as a
 * durable workflow under the approved claim (docs/research-view.md). Returns
 * at once; the artist page watches the onboarding state.
 *
 * @param artistId - The artist whose claim was just approved.
 * @returns Whether the API accepted it.
 */
export async function startClaimBuild(artistId: string): Promise<boolean> {
    const result = (await callResearchApi(`/api/onboarding/${artistId}/build`, { body: {} })) as { status?: string } | null;
    return result?.status === "ok";
}
