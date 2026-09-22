/** Normalize user input only. Server callers must still apply safe-fetch and ownership checks. */
export function normalizePublicUrl(input: string): string | null {
    const value = input.trim();
    if (value.startsWith('/') || !value || /[\s\\]/.test(value)) return null;
    const candidate = /^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`;
    if (!/^https?:\/\/[^/]/i.test(candidate)) return null;
    try {
        const url = new URL(candidate);
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
        const labels = url.hostname.split('.');
        if (labels.length < 2 || labels.some(label => !/^[a-z\d](?:[a-z\d-]*[a-z\d])?$/i.test(label))) return null;
        return candidate;
    } catch {
        return null;
    }
}
