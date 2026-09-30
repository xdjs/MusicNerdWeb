/** Locate complete literal Instagram handles without turning emails or URLs into mentions. */
export function getInstagramMentions(text: string): { start: number; end: number; handle: string; href: string }[] {
    const mentions: { start: number; end: number; handle: string; href: string }[] = [];
    for (const match of text.matchAll(/@([a-z0-9_.]+)/gi)) {
        const start = match.index;
        const before = text.slice(0, start);
        const after = text[start + match[0].length] ?? '';
        if (/[\p{L}\p{N}_@.%+]$/u.test(before)
            || /[\p{L}\p{N}][\p{L}\p{N}._%+\-]*-$/u.test(before)
            || /(?:[a-z][a-z0-9+.-]*:\/\/|www\.|\b(?:[a-z0-9-]+\.)+[a-z]{2,}[/:?#])\S*$/i.test(before)
            || /[\p{L}\p{N}_@/\\<>=\-]/u.test(after)) continue;

        // A sentence's trailing full stops are punctuation, not part of the handle.
        const handle = match[1].replace(/\.+$/, '').toLowerCase();
        if (handle.length > 30 || !/^[a-z0-9_]+(?:\.[a-z0-9_]+)*$/.test(handle)) continue;
        mentions.push({ start, end: start + handle.length + 1, handle, href: `https://www.instagram.com/${handle}/` });
    }
    return mentions;
}
