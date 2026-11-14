import type { UIMessage } from "ai";
import { getMessageText } from "./getMessageText";
import { CITATION_PATTERN, parseCitation } from "./parseCitation";

/** A cited source; `url` is null for a document with no public URL (the API's `musicnerd://` URL), which is never a link. */
export type ChatSource = { n: number; title: string; url: string | null };

/**
 * The sources an answer cites. The stream writes a `source-url` part for every
 * source the model read, `sourceId` = its number; the answer cites them as
 * `[n]`, `[n, m]`, or `[n, p.N]` / `[n, §Heading]` / `[n, ¶N]` for a place in a
 * document (`parseCitation`). Only numbers the text cites are returned, in order: a
 * source read and not used is not where the answer came from. Brackets holding
 * a date (`[2026-05-13]`) or a label (`[Artist Doc]`) are not citations.
 *
 * @param message - The assistant message.
 * @returns The cited sources, by number.
 */
export function getChatSources(message: UIMessage): ChatSource[] {
    const cited = new Set<number>();
    for (const match of getMessageText(message).matchAll(new RegExp(CITATION_PATTERN, "g")))
        for (const n of parseCitation(match[1])?.numbers ?? []) cited.add(n);
    const sources = new Map<number, ChatSource>();
    for (const part of message.parts) {
        if (part.type !== "source-url") continue;
        const n = Number(part.sourceId);
        if (!cited.has(n) || sources.has(n)) continue;
        const url = /^https?:\/\//i.test(part.url) ? part.url : null;
        sources.set(n, { n, title: part.title ?? url ?? "Saved document", url });
    }
    return [...sources.values()].sort((a, b) => a.n - b.n);
}
