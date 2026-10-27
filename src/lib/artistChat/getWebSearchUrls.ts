import type { UIMessage } from "ai";

type WebSearchPart = { type: string; output?: { results?: { url?: unknown }[] } };

/**
 * The URLs a message's `webSearch` steps returned, so a cited source can be
 * told apart as a web result rather than a saved source.
 *
 * @param message - The assistant message.
 * @returns The result URLs; empty when no search ran or none found anything.
 */
export function getWebSearchUrls(message: UIMessage): Set<string> {
    const urls = (message.parts as WebSearchPart[])
        .filter(part => part.type === "tool-webSearch")
        .flatMap(part => part.output?.results ?? [])
        .map(result => result.url)
        .filter((url): url is string => typeof url === "string");
    return new Set(urls);
}
