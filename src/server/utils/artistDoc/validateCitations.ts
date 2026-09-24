import type { DocSource } from "@/server/utils/artistDocService";

/** Strips any `[n]` marker that doesn't resolve to a real id in `sources` —
 *  the hard boundary that keeps a hallucinated citation from ever reaching
 *  the UI. Valid markers are left exactly as the model wrote them. */
export function validateCitations(text: string, sources: DocSource[]): string {
    const validIds = new Set(sources.map(s => s.id));
    return text
        .replace(/\[(\d+)\]/g, (full, idStr) => (validIds.has(Number(idStr)) ? full : ""))
        // A marker that isn't a number at all. The model cited the catalog block
        // as "[VERIFIED CATALOG]" — reference data presented to the reader as a
        // source, and one that resolves to nothing. Only numbered ids from the
        // manifest are citations; anything else in brackets is model litter.
        // Deliberately narrow: real prose uses brackets for asides, so this only
        // removes ALL-CAPS bracket tokens, which prose does not produce.
        .replace(/\s*\[[A-Z][A-Z \-_]{2,}\]/g, "")
        // "(date unknown)" is OUR label for the model, telling it we could not
        // establish a date. It has now twice been copied into the document as
        // though it were a fact about the release — '"Vi$ions" (date unknown)'.
        // The prompt forbids it and the model does it anyway, so remove it here
        // rather than adding a third sentence asking nicely. A missing date
        // should simply be absent, not announced.
        .replace(/\s*\((?:date unknown|year unknown|no date)\)/gi, "");
}
