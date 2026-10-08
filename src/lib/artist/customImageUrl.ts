/**
 * The artist's own uploaded image, or null when they haven't set one.
 *
 * `artists.custom_image` is nullable and has historically also held the empty
 * string, so callers can't simply null-check it.
 */
export function customImageUrl(customImage: string | null | undefined): string | null {
    const trimmed = customImage?.trim();
    return trimmed ? trimmed : null;
}
