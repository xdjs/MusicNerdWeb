/** A source's site as the research view names it: the host, without "www.". */
export function sourceDomain(url: string): string {
    try {
        return new URL(url).hostname.replace(/^www\./, "");
    } catch {
        return url;
    }
}
