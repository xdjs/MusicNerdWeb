/** The listening destination label for a recognized podcast episode URL. */
export function podcastService(url: string): "Apple Podcasts" | "iHeart" | null {
    try {
        const parsed = new URL(url);
        if (parsed.hostname === "podcasts.apple.com" && parsed.searchParams.has("i")) return "Apple Podcasts";
        if ((parsed.hostname === "iheart.com" || parsed.hostname === "www.iheart.com") && parsed.pathname.includes("/episode/")) return "iHeart";
    } catch { /* invalid URL */ }
    return null;
}
