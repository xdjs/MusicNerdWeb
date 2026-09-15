/** Hostname suffix → the platform token reported on `outbound_click`. Order matters only for overlaps. */
const PLATFORM_HOSTS: ReadonlyArray<readonly [string, string]> = [
    ['open.spotify.com', 'spotify'],
    ['spotify.com', 'spotify'],
    ['instagram.com', 'instagram'],
    ['x.com', 'x'],
    ['twitter.com', 'x'],
    ['youtube.com', 'youtube'],
    ['youtu.be', 'youtube'],
    ['bandcamp.com', 'bandcamp'],
    ['deezer.com', 'deezer'],
    ['soundcloud.com', 'soundcloud'],
    ['tiktok.com', 'tiktok'],
    ['facebook.com', 'facebook'],
    ['inprocess.world', 'inprocess'],
    ['music.apple.com', 'apple'],
    ['tidal.com', 'tidal'],
    // Vault sources are served from Supabase storage; the project ref is noise, the surface is the vault.
    ['supabase.co', 'vault'],
];

/** The platform behind an off-site link, or its bare hostname when we have no name for it; `null` for a non-URL. */
export function outboundPlatform(href: string): string | null {
    let hostname: string;
    try {
        hostname = new URL(href).hostname.toLowerCase();
    } catch {
        return null;
    }
    const match = PLATFORM_HOSTS.find(([host]) => hostname === host || hostname.endsWith(`.${host}`));
    if (match) return match[1];
    return hostname.replace(/^www\./, '');
}
