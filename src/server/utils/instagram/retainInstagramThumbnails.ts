import { retainInstagramThumbnail } from "./retainInstagramThumbnail";
import type { ThumbnailUploadScope } from "./types";
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
