/** Only public portrait paths; never turn stored arbitrary URLs into server fetches. */
export function eligibleSharePortrait(value: string | null, artistId: string, storageOrigin: string): string | null {
    if (!value) return null;
    if (/^\/artist-images\/[a-zA-Z0-9_-]+\.(png|jpe?g|webp)$/.test(value)) return value;
    try {
        const url = new URL(value);
        if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash) return null;
        if (['i.scdn.co', 'image-cdn-fa.spotifycdn.com', 'image-cdn-ak.spotifycdn.com'].includes(url.hostname) && /^\/image\/[a-zA-Z0-9]+$/.test(url.pathname)) return url.href;
        if (url.hostname === 'cdn-images.dzcdn.net' && /^\/images\/artist\/[a-zA-Z0-9/_.-]+$/.test(url.pathname)) return url.href;
        if (storageOrigin && url.origin === new URL(storageOrigin).origin
            && url.pathname.startsWith(`/storage/v1/object/public/vault-files/profile-images/${artistId}_`)
            && /^\d+\.(png|jpe?g|webp)$/.test(url.pathname.split(`${artistId}_`)[1] ?? '')) return url.href;
    } catch { /* Invalid or absent configuration is ineligible. */ }
    return null;
}
