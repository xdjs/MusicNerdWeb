const SCROLL_KEYS = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "]);

/** Whether a key press is the artist scrolling the page themselves, which
 *  stops the build from following research (docs/research-view.md, "Follow"). */
export function isScrollKey(key: string): boolean {
    return SCROLL_KEYS.has(key);
}
