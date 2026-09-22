/** Automatic Lore eligibility only; deliberately submitted sources keep their existing policy. */
export function isExcludedLoreDiscoveryUrl(url: string): boolean {
    try {
        const host = new URL(url).hostname.toLowerCase().replace(/\.$/, '');
        return ['linkedin.com', 'lnkd.in'].some(domain => host === domain || host.endsWith(`.${domain}`));
    } catch {
        // Invalid/unsafe URL handling belongs to the existing URL-safety gate.
        return false;
    }
}
