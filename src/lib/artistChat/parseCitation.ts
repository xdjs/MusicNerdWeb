/**
 * A bracketed marker in an answer; group 1 is its body. A marker is at most 60
 * characters, except `[n, p.N]`, `[n, §Heading]` or `[n, ¶N]`, whose locator
 * can run to 300 characters (the API's title limit) and hold anything but `]`.
 * The bound keeps a long line of unclosed markers linear to scan.
 */
export const CITATION_PATTERN = /\[(\d{1,3}\s*,\s*(?:p\.|§|¶)[^\]\n]{0,299}|[^\]]{1,60})\]/.source;

/** The API's locator elements: a page, section or paragraph (MusicNerdAPI `findCitationNumbers`). */
const LOCATOR = /^(?:p\.|§|¶)/u;
/** A locator or a legacy PDF page label the model writes inside a citation: "p.8", "pp.10", "page 3", "¶3". */
const LABEL = /^(?:(?:p|pp|page|pages)\.?\s*\d|¶\s*\d)/iu;
/** The chat numbers at most 256 documents, so a year is never one. */
const NUMBER = /^[1-9]\d{0,2}$/;

/**
 * Reads a citation marker's body in the chat's grammar. `[n, p.N]`,
 * `[n, §Heading]` and `[n, ¶N]` cite only `n`, and the rest is the label shown
 * beside it (a heading keeps its commas). Otherwise every number in the group is
 * cited ("[11, 18, Artist Doc]"; a number is 1–999 written plainly, so not
 * "007", "3.0" or "1999"), with any PDF page label beside them
 * ("[3, pp.10]"); words the model invented are dropped.
 *
 * @param body - The text between the brackets.
 * @returns The cited numbers and labels, or `null` for a bracketed date ("[2026-05-13]"), which is not a citation.
 */
export function parseCitation(body: string): { numbers: number[]; labels: string[] } | null {
    const [first, ...rest] = body.split(",").map(piece => piece.trim());
    if (rest.length && LOCATOR.test(rest[0])) {
        const numbers = NUMBER.test(first) ? [Number(first)] : [];
        const labels = rest[0].startsWith("§") ? [rest.join(", ")] : rest.filter(piece => LABEL.test(piece));
        return { numbers, labels };
    }
    if (/\d{4}-\d{2}/.test(body)) return null;
    const pieces = [first, ...rest];
    return {
        numbers: pieces.filter(piece => NUMBER.test(piece)).map(Number),
        labels: pieces.filter(piece => LABEL.test(piece)),
    };
}
