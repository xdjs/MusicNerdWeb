/**
 * Removes the citation markers nothing can resolve — "[7]" with no source for
 * 7, "[Artist Doc]" — together with the whitespace before them, so a dropped
 * marker leaves "Negron." rather than "Negron .". A marker with at least one
 * number in `numbers`, and a date in brackets ("[2026-05-13]"), stay.
 *
 * @param text - The answer text.
 * @param numbers - The citation numbers that have a source.
 * @returns The text without unresolvable markers.
 */
export function removeUnresolvedCitations(text: string, numbers: Set<number>): string {
    return text.replace(/[^\S\n]*\[([^\]]{1,60})\]/g, (marker, body: string) =>
        /\d{4}-\d{2}/.test(body) || body.split(",").some(piece => numbers.has(Number(piece.trim()))) ? marker : "");
}
