"use server";

import type { ArtistVaultSource } from "@/server/db/DbTypes";
import { getServerAuthSession } from "@/server/auth";
import { getDevSession } from "@/server/utils/dev-auth";
import { canEditArtist } from "@/server/utils/artistEditAuth";
import { insertVaultSource, updateVaultSourceContent } from "@/server/utils/queries/dashboardQueries";
import { getLoreClaimGeneration } from "@/server/utils/queries/lorePersistence";
import { queueLoreRefresh } from "@/server/utils/queries/loreRefresh";
import { getVaultSourceUrlsByArtistId } from "@/server/utils/queries/getVaultSourceUrlsByArtistId";
import { inferTypeFromUrl } from "@/lib/source/sourceTypes";
import { canonicalizeLoreUrl } from "@/lib/source/canonicalizeLoreUrl";
import { podcastService } from "@/lib/source/podcastService";
import { fetchPageContent, isUnsafeUrl } from "@/server/utils/fetchPageContent";
import { fetchLinkPreview } from "@/server/utils/linkPreview";

export async function addVaultSource(
    artistId: string,
    url: string
): Promise<{ success: boolean; error?: string; source?: ArtistVaultSource; warning?: string }> {
    const session = await getServerAuthSession() ?? await getDevSession();
    if (!session) return { success: false, error: "Not authenticated" };

    try {
        const claimId = await getLoreClaimGeneration(artistId);
        if (!(await canEditArtist(session.user.id, artistId))) {
            return { success: false, error: "Not authorized for this artist" };
        }

        // Reject non-http(s) schemes (javascript:, data:, file:, etc.) and private/local hosts.
        // URLs are rendered as <a href> on the public artist page — unsafe schemes would be stored XSS.
        const normalizedUrl = canonicalizeLoreUrl(url);
        if (!normalizedUrl || isUnsafeUrl(normalizedUrl)) {
            return { success: false, error: "URL must be a public http or https address" };
        }

        url = normalizedUrl;

        const existing = await getVaultSourceUrlsByArtistId(artistId);
        if (existing.some(sourceUrl => canonicalizeLoreUrl(sourceUrl) === url)) {
            return { success: false, error: "This source has already been added" };
        }

        // Card metadata is separate from the durable original-text job.
        const preview = await fetchLinkPreview(url);
        let title = "Untitled Source";
        try {
            const parsed = new URL(url);
            title = `Source from ${parsed.hostname.replace("www.", "")}`;
        } catch {
            // malformed URL — use default title
        }

        const source = await insertVaultSource({
            artistId,
            url,
            title: preview.title ?? title,
            ogImage: preview.imageUrl,
            type: inferTypeFromUrl(url),
            status: "pending",
        }, { userId: session.user.id, expectedClaimId: claimId },
            { userId: session.user.id, trigger: "editor_source", approveIfTrusted: true });
        if (!source) return { success: false, error: "This source has already been added" };

        // Episode identity is required for grouping. Await metadata only; the API
        // owns original-text persistence, so this cannot overwrite a newer body.
        if (source?.id && podcastService(url)) {
            const enrichment = fetchPageContent(url).then(content =>
                updateVaultSourceContent(source.id, {
                    title: content.title,
                    snippet: content.snippet,
                    ogImage: content.ogImage,
                    ...content.podcastEpisode,
                    publishedAt: content.publishedAt ?? null,
                })
            ).catch(e => console.error("[addVaultSource] Content enrichment failed:", e));
            await enrichment;
        }

        let warning: string | undefined;
        if (source.status === "approved") {
            try { await queueLoreRefresh(artistId, claimId, { userId: session.user.id, trigger: "source_submission" }); }
            catch (error) {
                console.error('[addVaultSource] Source saved; Lore enqueue failed', error);
                warning = 'Source saved and approved, but the Lore refresh could not start. Use Look again to retry; do not add the source again.';
            }
        }
        return { success: true, source, warning };
    } catch (error) {
        console.error("[addVaultSource] Error:", error);
        return { success: false, error: "Failed to add source" };
    }
}
