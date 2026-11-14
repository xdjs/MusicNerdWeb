import type { UIMessage } from "ai";

type Part = UIMessage["parts"][number];

/** The fields of a `documents` entry MusicNerdAPI's `validateArtistChatBody` checks (`documentRef`). */
const DOCUMENT_FIELDS = ["n", "sourceKind", "sourceId", "revision", "title", "url"] as const;

/** The keys of `value` among `keys`, the ones it has. */
function pick(value: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> {
    return Object.fromEntries(keys.filter(key => key in value).map(key => [key, value[key]]));
}

/** `documents` with each entry cut to `DOCUMENT_FIELDS`; anything not a list of objects is left as it is, for the API to judge. */
function documentsOf(documents: unknown): unknown {
    return Array.isArray(documents)
        ? documents.map(entry => typeof entry === "object" && entry !== null ? pick(entry as Record<string, unknown>, DOCUMENT_FIELDS) : entry)
        : documents;
}

/**
 * A passage tool's output cut to what `validateArtistChatBody` reads from it:
 * - `searchPassages`: `documents` (the numbers it gave), and `error` (a refused search).
 * - `readUnits`: `documents`, `error` (a failed read), and `units` with only each unit's
 *   `locator`, since the API asks only whether the output has `units`.
 * - `listDocuments`: nothing; the API never reads it.
 */
function slimOutput(type: string, output: Record<string, unknown>): Record<string, unknown> {
    if (type === "tool-listDocuments") return {};
    const slim = pick(output, ["error", "documents"]);
    if ("documents" in slim) slim.documents = documentsOf(slim.documents);
    if (type === "tool-readUnits" && "units" in output)
        slim.units = Array.isArray(output.units)
            ? output.units.map(unit => typeof unit === "object" && unit !== null ? pick(unit as Record<string, unknown>, ["locator"]) : {})
            : output.units;
    return slim;
}

const PASSAGE_TOOLS = new Set(["tool-searchPassages", "tool-readUnits", "tool-listDocuments"]);

/** A part to send: a passage tool's with its output slimmed, a new object; any other unchanged. */
function requestPart(part: Part): Part {
    const output = (part as { output?: unknown }).output;
    if (!PASSAGE_TOOLS.has(part.type) || typeof output !== "object" || output === null) return part;
    return { ...part, output: slimOutput(part.type, output as Record<string, unknown>) } as Part;
}

/**
 * The conversation as the chat endpoint takes it, built as new objects so the
 * page's messages stay as they are. Each message keeps only its `text` and
 * `tool-*` parts: all MusicNerdAPI reads from a replayed turn (the text, PDF
 * reads, and the `documents` a `searchPassages` or `readUnits` output numbered,
 * which keep `[n]` meaning the same document across turns). Source parts, step
 * markers and reasoning are left out: the API ignores them, and it rejects any
 * message with more than 64 parts, which the `source-url` parts a units-mode
 * answer re-sends for every earlier document soon exceed. The passage tools'
 * outputs go back cut to what the API reads (`slimOutput`), not their passage
 * and page text; every other part goes back unchanged.
 *
 * @param messages - `useChat`'s messages.
 * @returns The messages to send.
 */
export function getChatRequestMessages(messages: UIMessage[]): UIMessage[] {
    return messages.map(message => ({
        ...message,
        parts: message.parts.filter(part => part.type === "text" || part.type.startsWith("tool-")).map(requestPart),
    }));
}
