import { instagramPostImage } from './artistLatest';

/** Only use dimensions belonging to the selected retained thumbnail. */
export function instagramPostImageDimensions(raw: unknown): { width: number; height: number } | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const retained = (raw as Record<string, unknown>)._musicnerdThumbnail;
    if (!retained || typeof retained !== 'object') return undefined;
    const { url, width, height } = retained as Record<string, unknown>;
    if (!url || url !== instagramPostImage(raw)) return undefined;
    // The retention worker resizes inside 640 × 640 without enlargement.
    if (typeof width !== 'number' || typeof height !== 'number'
        || !Number.isInteger(width) || !Number.isInteger(height)
        || width <= 0 || height <= 0 || width > 640 || height > 640) return undefined;
    return { width, height };
}
