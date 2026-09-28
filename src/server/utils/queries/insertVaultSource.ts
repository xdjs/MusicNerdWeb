import { db } from '@/server/db/drizzle';
import { artistVaultSources } from '@/server/db/schema';
import { canonicalizeLoreUrl } from '@/lib/source/canonicalizeLoreUrl';
import { withArtistUploadWrite, withScopedArtistWrite, type WriteDb } from './ownershipWrites';
import { getArtistOperationOwnership } from '../artistOperationContext';
import { recordArtistActivity } from '../activity/recordArtistActivity';

export async function insertVaultSource(data: {
    artistId: string;
    url: string;
    title?: string;
    snippet?: string;
    type?: string;
    status?: "pending" | "approved" | "rejected";
    fileName?: string;
    fileSize?: number;
    filePath?: string;
    contentType?: string;
    extractedText?: string | null;
    ogImage?: string | null;
    podcastEpisodeKey?: string | null;
    podcastShowTitle?: string | null;
    podcastEpisodeTitle?: string | null;
    /** ISO date (YYYY-MM-DD) the source says it was published, or null. */
    publishedAt?: string | null;
}, authorization?: { userId: string; expectedClaimId: string | null }, provenance?: {
    userId: string; trigger: string;
}) {
    try {
        const url = canonicalizeLoreUrl(data.url) ?? data.url;
        const write = async (writer: WriteDb) => {
        const context = getArtistOperationOwnership(data.artistId);
        const userId = provenance?.userId ?? authorization?.userId ?? context?.userId;
        const origin = context?.sourceOrigin ?? (userId ? data.filePath ? 'upload' : 'submission' : 'unknown');
        const activityId = context?.activityId ?? await recordArtistActivity(data.artistId,
            origin === 'upload' ? 'source_upload' : origin === 'submission' ? 'source_submission' : 'source_added', {
                userId, trigger: provenance?.trigger ?? (data.filePath ? 'upload' : context?.trigger ?? 'editor_source'),
            }, writer);
        // onConflictDoNothing pairs with the unique index on (artist_id, url)
        // added in 0014. Dedup used to be a read-then-write with nothing
        // underneath, so two overlapping discovery runs both read "absent" and
        // both inserted — a real artist's vault held the same interview twice.
        const [source] = await writer
            .insert(artistVaultSources)
            .values({
                artistId: data.artistId,
                origin, activityId,
                url,
                title: data.title,
                snippet: data.snippet,
                type: data.type ?? "article",
                status: data.status ?? "pending",
                fileName: data.fileName,
                fileSize: data.fileSize,
                filePath: data.filePath,
                contentType: data.contentType,
                extractedText: data.extractedText,
                ogImage: data.ogImage,
                podcastEpisodeKey: data.podcastEpisodeKey,
                podcastShowTitle: data.podcastShowTitle,
                podcastEpisodeTitle: data.podcastEpisodeTitle,
                publishedAt: data.publishedAt ?? null,
            })
            .onConflictDoNothing({ target: [artistVaultSources.artistId, artistVaultSources.url] })
            .returning();
        // Undefined when the row already existed — a concurrent run won the
        // race. Callers treat a missing row as "nothing new to enrich", which is
        // correct: the source is present either way.
        return source;
        };
        return authorization
            ? await withArtistUploadWrite(data.artistId, authorization.userId, authorization.expectedClaimId, write)
            : getArtistOperationOwnership(data.artistId)
                ? await withScopedArtistWrite(data.artistId, write)
                : await db.transaction(write);
    } catch (e) {
        console.error("[insertVaultSource] Error:", e);
        throw e;
    }
}
