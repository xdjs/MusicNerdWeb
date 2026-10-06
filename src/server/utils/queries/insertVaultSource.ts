import { db } from '@/server/db/drizzle';
import { artistVaultSources } from '@/server/db/schema';
import { canonicalizeLoreUrl } from '@/lib/source/canonicalizeLoreUrl';
import { withArtistUploadWrite, withScopedArtistWrite, type WriteDb } from './ownershipWrites';
import { getArtistOperationOwnership } from '../artistOperationContext';
import { recordArtistActivity } from '../activity/recordArtistActivity';
import { sql } from 'drizzle-orm';
import { queueApprovedSourceExtraction } from '@/server/utils/source/queueApprovedSourceExtraction';

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
    userId: string; trigger: string; approveIfTrusted?: boolean;
}) {
    try {
        const url = canonicalizeLoreUrl(data.url) ?? data.url;
        const write = async (writer: WriteDb) => {
        // Serialize with claim changes and worker checkpoints before any source write.
        await writer.execute(sql`select id from artists where id=${data.artistId}::uuid for update`);
        const context = getArtistOperationOwnership(data.artistId);
        const userId = provenance?.userId ?? authorization?.userId ?? context?.userId;
        let status = data.status ?? 'pending';
        let submissionTrigger = provenance?.trigger;
        if (provenance?.approveIfTrusted) {
            // Hold the current role through publication. A completed revocation
            // before this lock saves pending; a concurrent revocation waits.
            const [user] = await writer.execute(sql`
                select is_admin, is_white_listed from users
                where id = ${provenance.userId}::uuid for share
            `);
            if (!user) throw new Error('Submitting account no longer exists');
            const trusted = !!(user.is_admin || user.is_white_listed);
            status = trusted ? 'approved' : 'pending';
            if (trusted) submissionTrigger = 'trusted_submission';
        }
        const origin = context?.sourceOrigin ?? (userId ? data.filePath ? 'upload' : 'submission' : 'unknown');
        let activityId = context?.activityId ?? null;
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
                status,
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
        if (!source) return undefined;
        // Record additions only for the writer that won the uniqueness check.
        // Both writes share this transaction: audit failure rolls back the source.
        if (!activityId) {
            activityId = await recordArtistActivity(data.artistId,
                origin === 'upload' ? 'source_upload' : origin === 'submission' ? 'source_submission' : 'source_added', {
                    userId, sourceId: source.id,
                    trigger: submissionTrigger ?? (data.filePath ? 'upload' : context?.trigger ?? 'editor_source'),
                }, writer);
            await writer.execute(sql`update artist_vault_sources set activity_id = ${activityId}::uuid where id = ${source.id}::uuid`);
        }
        await queueApprovedSourceExtraction(writer, source, activityId);
        return { ...source, activityId };
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
