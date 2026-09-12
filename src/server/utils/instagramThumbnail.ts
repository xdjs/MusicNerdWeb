import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '@/env';
import { VAULT_BUCKET } from '@/server/lib/supabase';

const MAX_BYTES = 8 * 1024 * 1024;
export type ThumbnailUploadScope = { jobId: string; attemptedPaths: Set<string> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Only Instagram's media hosts, never arbitrary URLs from scraped metadata.
 * Redirects are refused so an allowed host cannot redirect into our network. */
export function instagramMediaUrl(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    try {
        const url = new URL(value);
        if (url.protocol !== 'https:' || url.port || url.username || url.password) return null;
        return ['cdninstagram.com', 'fbcdn.net'].some(host => url.hostname.endsWith(`.${host}`)) ? url.href : null;
    } catch { return null; }
}

async function readImage(response: Response): Promise<Buffer> {
    if (!response.ok || !/^image\/(jpeg|png|webp)(?:;|$)/i.test(response.headers.get('content-type') ?? '')) throw new Error('Invalid media response');
    if (Number(response.headers.get('content-length')) > MAX_BYTES || !response.body) throw new Error('Image too large or empty');
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            length += value.byteLength;
            if (length > MAX_BYTES) throw new Error('Image too large');
            chunks.push(value);
        }
        return Buffer.concat(chunks);
    } finally { await reader.cancel(); }
}

/** Ingestion only. Keep the displayUrl field backward compatible so existing
 * deployed Latest readers also benefit from a thumbnail refresh. The original
 * URL stays in retention metadata; post URLs/captions are never altered.
 * A failed attempt returns the original payload; upsert preserves an older
 * retained thumbnail rather than replacing it with another expiring URL. */
export async function retainInstagramThumbnail(raw: unknown, artistId: string, postId: string, scope?: ThumbnailUploadScope): Promise<unknown> {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
    const post = { ...raw } as Record<string, unknown>;
    // Never trust a scraper-provided value as evidence of a successful upload.
    delete post._musicnerdThumbnail;
    if (!UUID.test(artistId) || (scope && !UUID.test(scope.jobId)) || !/^\d+$/.test(postId) || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return post;
    const candidates = [...new Set([post.displayUrl, post.thumbnailSrc, ...(Array.isArray(post.images) ? post.images : [])]
        .map(instagramMediaUrl).filter((url): url is string => url !== null))].slice(0, 3);
    const signal = AbortSignal.timeout(9000);
    for (const sourceUrl of candidates) {
        try {
            const response = await fetch(sourceUrl, { redirect: 'error', signal });
            const input = await readImage(response);
            const image = sharp(input, { limitInputPixels: 40_000_000, animated: false });
            const metadata = await image.metadata();
            if (!['jpeg', 'png', 'webp'].includes(metadata.format ?? '')) throw new Error('Unsupported image');
            const { data, info } = await image.rotate().resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 80 }).toBuffer({ resolveWithObject: true });
            signal.throwIfAborted();
            const hash = createHash('sha256').update(data).digest('hex');
            // Flat artist folder is included in the existing claim-revocation
            // storage purge. Content-addressed names make retries immutable.
            // Job scope prevents revocation cleanup from deleting another job's
            // identical thumbnail (including a newly approved claimant's job).
            const path = `${artistId}/instagram-${scope ? `${scope.jobId}-` : ''}${postId}-${hash}.webp`;
            // Track before POST: a failed response can still mean it was stored.
            scope?.attemptedPaths.add(path);
            const objectUrl = `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/${VAULT_BUCKET}/${path}`;
            const upload = await fetch(objectUrl, {
                method: 'POST', redirect: 'error', signal,
                headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, apikey: SUPABASE_SERVICE_ROLE_KEY,
                    'Content-Type': 'image/webp', 'Cache-Control': 'max-age=31536000', 'x-upsert': 'false' },
                body: new Uint8Array(data),
            });
            if (!upload.ok) {
                const error = await upload.json().catch(() => null);
                if (error?.error !== 'Duplicate' && error?.code !== 'Duplicate') throw new Error('Thumbnail upload failed');
            }
            const url = `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/${VAULT_BUCKET}/${path}`;
            return { ...post, displayUrl: url, _musicnerdThumbnail: {
                version: 1, url, sourceUrl, capturedAt: new Date().toISOString(), sha256: hash, width: info.width, height: info.height,
            } };
        } catch {
            if (signal.aborted) break;
        }
    }
    if (candidates.length) console.warn('[instagramThumbnail] Retention failed', { artistId, postId });
    return post;
}

/** Three downloads at once, outside database ownership transactions. */
export async function retainInstagramThumbnails<T extends { artistId: string; platformPostId: string; isOwnPost: boolean; raw: unknown }>(rows: T[], scope?: ThumbnailUploadScope): Promise<T[]> {
    const prepared = [...rows];
    let cursor = 0;
    await Promise.all(Array.from({ length: Math.min(3, rows.length) }, async () => {
        while (cursor < rows.length) {
            const index = cursor++;
            const row = rows[index]!;
            // Latest only publishes the artist's own posts.
            if (row.isOwnPost) prepared[index] = { ...row, raw: await retainInstagramThumbnail(row.raw, row.artistId, row.platformPostId, scope) };
        }
    }));
    return prepared;
}

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

/** Only use this for metadata read from our database, never scraper payloads.
 * Keep an existing post thumbnail across refresh jobs; metadata still refreshes. */
export function storedInstagramThumbnail(raw: unknown, artistId: string, postId: string): Record<string, unknown> | null {
    if (!raw || typeof raw !== 'object' || !UUID.test(artistId) || !/^\d+$/.test(postId)) return null;
    const metadata = (raw as Record<string, unknown>)._musicnerdThumbnail;
    if (!metadata || typeof metadata !== 'object') return null;
    const retained = metadata as Record<string, unknown>;
    if (retained.version !== 1 || typeof retained.url !== 'string' || typeof retained.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(retained.sha256)) return null;
    const prefix = `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/${VAULT_BUCKET}/${artistId}/instagram-`;
    if (!retained.url.startsWith(prefix)) return null;
    const name = retained.url.slice(prefix.length);
    const suffix = `${postId}-${retained.sha256}.webp`;
    if (name !== suffix && !(name.endsWith(`-${suffix}`) && UUID.test(name.slice(0, -(suffix.length + 1))))) return null;
    return retained;
}
