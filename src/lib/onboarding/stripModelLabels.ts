/** Hides the labels the model sometimes copies out of its own material while a
 *  draft streams: all-caps bracket tokens like `[VERIFIED CATALOG]` and our
 *  "(date unknown)". `validateCitations` removes the same ones from the saved
 *  text; this keeps them off the artist's screen while it's being written. */
export function stripModelLabels(text: string): string {
    return text
        .replace(/\s*\[[A-Z][A-Z \-_]{2,}\]/g, "")
        .replace(/\s*\((?:date unknown|year unknown|no date)\)/gi, "");
}
