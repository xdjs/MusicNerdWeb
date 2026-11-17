import type { UIMessage } from "ai";

type ToolPart = {
    type: string;
    input?: { sourceId?: unknown; filename?: unknown };
    output?: { title?: unknown; sources?: { sourceId?: unknown; title?: unknown }[] };
};

/**
 * What the chat is doing before the answer's text arrives, from the latest
 * tool step in the streamed message: `searchSources`, `searchPdfSources`,
 * `readSource` or `readPdfSource` / `readNamedPdf` (named by the document's
 * title, from its output, from the search that found it or from the filename
 * asked for) or `webSearch`.
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
