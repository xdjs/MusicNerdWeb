import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "@/env";
import { VAULT_BUCKET } from "@/server/lib/supabase";
import type { ThumbnailUploadScope } from "./types";
import { UUID } from "./const";
/** Compensate after a revoked job loses its guarded DB write. Only internally
 * generated paths for that job are accepted, never scraper metadata. */
export async function removeRevokedInstagramThumbnails(artistId: string, scope: ThumbnailUploadScope): Promise<void> {
    if (!scope.attemptedPaths.size) return;
    if (!UUID.test(artistId) || !UUID.test(scope.jobId)) throw new Error('Invalid thumbnail cleanup scope');
    const prefix = `${artistId}/instagram-${scope.jobId}-`;
    const paths = [...scope.attemptedPaths];
    if (paths.some(path => !path.startsWith(prefix) || !/^\d+-[a-f0-9]{64}\.webp$/.test(path.slice(prefix.length)))) {
        throw new Error('Invalid thumbnail cleanup path');
    }
    const response = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/${VAULT_BUCKET}`, {
        method: 'DELETE', redirect: 'error', signal: AbortSignal.timeout(9000),
        headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, apikey: SUPABASE_SERVICE_ROLE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefixes: paths }),
    });
    if (!response.ok) throw new Error('Revoked Instagram thumbnail cleanup failed');
}
