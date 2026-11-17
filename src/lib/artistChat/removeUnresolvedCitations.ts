import { CITATION_PATTERN, parseCitation } from "./parseCitation";

/**
 * Removes the citation markers nothing can resolve — "[7]" with no source for
 * 7, "[Artist Doc]" — together with the whitespace before them, so a dropped
 * marker leaves "Negron." rather than "Negron .". A marker with at least one
 * cited number in `numbers` (`[2, §Live, 1999]` cites only 2), and a date in
 * brackets ("[2026-05-13]"), stay.
 *
 * @param text - The answer text.
 * @param numbers - The citation numbers that have a source.
 * @returns The text without unresolvable markers.
 */
export function removeUnresolvedCitations(text: string, numbers: Set<number>): string {
    return text.replace(new RegExp(`[^\\S\\n]*${CITATION_PATTERN}`, "g"), (marker, body: string) => {
        const citation = parseCitation(body);
        return !citation || citation.numbers.some(n => numbers.has(n)) ? marker : "";
    });
}
