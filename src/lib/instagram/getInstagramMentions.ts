/** Locate complete literal Instagram handles without turning emails or URLs into mentions. */
export function getInstagramMentions(text: string): { start: number; end: number; handle: string; href: string }[] {
    const mentions: { start: number; end: number; handle: string; href: string }[] = [];
    // Treat literal markup as text, including quoted > characters and unfinished tags.
    // Requiring a tag-like opener keeps ordinary caption hearts (<3) out of these ranges.
    const markup = [...text.matchAll(/<!--[\s\S]*?(?:-->|$)|<(?=\/?[a-z]|[!?])(?:[^>"']|"[^"]*(?:"|$)|'[^']*(?:'|$))*(?:>|$)/gi)];
    for (const match of text.matchAll(/@([a-z0-9_.]+)/gi)) {
        const start = match.index;
        if (markup.some(tag => start >= tag.index && start < tag.index + tag[0].length)) continue;
        const before = text.slice(0, start);
        const after = text[start + match[0].length] ?? '';
        // A sentence's trailing full stops are punctuation, not part of the handle.
        const handle = match[1].replace(/\.+$/, '').toLowerCase();
        const emailLocal = before.match(/[a-z0-9._%+\-]+$/i)?.[0] ?? '';
        const email = /[a-z0-9]/i.test(emailLocal) && !emailLocal.endsWith('.')
            && /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(handle);
        // Punctuation can introduce a mention; exclude actual word/email/URL contexts.
        if (/[\p{L}\p{N}_@]$/u.test(before) || email
            || /(?:[a-z][a-z0-9+.-]*:\/\/|www\.|\b(?:[a-z0-9-]+\.)+[a-z]{2,}[/:?#])\S*$/i.test(before)
            || /[\p{L}\p{N}_@/\\<>=\-]/u.test(after)) continue;

        if (handle.length > 30 || !/^[a-z0-9_]+(?:\.[a-z0-9_]+)*$/.test(handle)) continue;
        mentions.push({ start, end: start + handle.length + 1, handle, href: `https://www.instagram.com/${handle}/` });
    }
    return mentions;
}
