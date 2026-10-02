import { SUPABASE_URL } from "@/env";
import { VAULT_BUCKET } from "@/server/lib/supabase";
import { UUID } from "./const";
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
