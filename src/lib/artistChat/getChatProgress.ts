import type { UIMessage } from "ai";

type ToolPart = { type: string; input?: { sourceId?: unknown }; output?: { title?: unknown; sources?: { sourceId?: unknown; title?: unknown }[] } };

/**
 * What the chat is doing before the answer's text arrives, from the latest
 * tool step in the streamed message: `searchSources`, `readSource` (named by
 * the source's title, from its output or from the search that found it) or
 * `webSearch`.
 *
 * @param message - The assistant message streaming in, if one has started.
 * @returns The status line.
 */
export function getChatProgress(message: UIMessage | undefined): string {
    const tools = (message?.parts ?? []).filter(part => part.type.startsWith("tool-")) as ToolPart[];
    const latest = tools.at(-1);
    if (latest?.type === "tool-webSearch") return "Searching the web…";
    if (latest?.type === "tool-searchSources") return "Searching saved sources…";
    if (latest?.type !== "tool-readSource") return "Checking Lore…";
    const found = tools.flatMap(tool => tool.type === "tool-searchSources" ? tool.output?.sources ?? [] : [])
        .find(source => source.sourceId === latest.input?.sourceId);
    const title = latest.output?.title ?? found?.title;
    return typeof title === "string" && title ? `Reading ${title}…` : "Reading a saved source…";
}
