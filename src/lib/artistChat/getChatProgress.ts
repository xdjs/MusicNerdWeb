import type { UIMessage } from "ai";

type Titled = { n?: unknown; sourceId?: unknown; title?: unknown };
type ToolPart = {
    type: string;
    input?: { sourceId?: unknown; filename?: unknown; n?: unknown; locators?: unknown };
    output?: { title?: unknown; sources?: Titled[]; documents?: Titled[] };
};

/**
 * What the chat is doing before the answer's text arrives, from the latest
 * tool step in the streamed message: `searchSources`, `searchPdfSources`,
 * `readSource` or `readPdfSource` / `readNamedPdf` (named by the document's
 * title, from its output, from the search that found it or from the filename
 * asked for), `webSearch`, or the passage tools `searchPassages`,
 * `listDocuments` and `readUnits` (named by the title of document `n`).
 *
 * @param message - The assistant message streaming in, if one has started.
 * @returns The status line.
 */
export function getChatProgress(message: UIMessage | undefined): string {
    const tools = (message?.parts ?? []).filter(part => part.type.startsWith("tool-")) as ToolPart[];
    const latest = tools.at(-1);
    if (latest?.type === "tool-webSearch") return "Searching the web…";
    if (latest?.type === "tool-searchSources") return "Searching saved sources…";
    if (latest?.type === "tool-searchPdfSources") return "Searching Lore PDFs…";
    if (latest?.type === "tool-searchPassages") return "Searching saved documents…";
    if (latest?.type === "tool-listDocuments") return "Listing saved documents…";
    if (latest?.type === "tool-readUnits") return readingDocument(message?.parts ?? [], tools, latest);
    if (latest?.type === "tool-readSource") return reading(tools, "tool-searchSources", latest, "Reading a saved source…");
    if (latest?.type === "tool-readPdfSource" || latest?.type === "tool-readNamedPdf")
        return reading(tools, "tool-searchPdfSources", latest, "Reading a PDF…");
    return "Checking Lore…";
}

/** "Reading <title>…" for a read step, from its output, the discovery step that found it, or the filename asked for. */
function reading(tools: ToolPart[], discovery: string, latest: ToolPart, fallback: string): string {
    const found = tools.flatMap(tool => tool.type === discovery ? tool.output?.sources ?? [] : [])
        .find(source => source.sourceId === latest.input?.sourceId);
    const title = latest.output?.title ?? found?.title ?? latest.input?.filename;
    return typeof title === "string" && title ? `Reading ${title}…` : fallback;
}

/**
 * "Reading <title>, p.4…" for a `readUnits` step: document `n`'s title from the
 * read's output, a `searchPassages` or `listDocuments` step that listed it, or
 * the `source-url` part the turn wrote for a document an earlier answer
 * numbered; the locator only when exactly one was asked for.
 */
function readingDocument(parts: UIMessage["parts"], tools: ToolPart[], latest: ToolPart): string {
    const n = latest.input?.n;
    const listed = tools.flatMap(tool => tool.type === "tool-searchPassages" || tool.type === "tool-listDocuments"
        ? tool.output?.documents ?? [] : []).find(document => document.n === n);
    const cited = parts.find(part => part.type === "source-url" && part.sourceId === String(n)) as Titled | undefined;
    const title = latest.output?.title ?? listed?.title ?? cited?.title;
    if (typeof title !== "string" || !title) return "Reading a saved document…";
    const locators = latest.input?.locators;
    const locator = Array.isArray(locators) && locators.length === 1 && typeof locators[0] === "string" ? `, ${locators[0]}` : "";
    return `Reading ${title}${locator}…`;
}
