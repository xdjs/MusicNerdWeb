import type { UIMessage } from "ai";
import { getMessageText } from "./getMessageText";

export type ChatSource = { n: number; title: string; url: string };

/**
 * The sources an answer cites. The stream writes a `source-url` part for every
 * source the model read, `sourceId` = its number; the answer cites them as
 * `[n]` or `[n, m]`. Only numbers the text cites are returned, in order: a
 * source read and not used is not where the answer came from. Brackets holding
 * a date (`[2026-05-13]`) or a label (`[Artist Doc]`) are not citations.
 *
 * @param message - The assistant message.
 * @returns The cited sources, by number.
 */
export function getChatSources(message: UIMessage): ChatSource[] {
    const cited = new Set<number>();
    for (const match of getMessageText(message).matchAll(/\[([^\]]{1,60})\]/g)) {
        if (/\d{4}-\d{2}/.test(match[1])) continue;
        for (const piece of match[1].split(",")) {
            const n = Number(piece.trim());
            if (Number.isInteger(n) && n > 0) cited.add(n);
        }
    }
    const sources = new Map<number, ChatSource>();
    for (const part of message.parts) {
        if (part.type !== "source-url") continue;
        const n = Number(part.sourceId);
        if (cited.has(n) && !sources.has(n)) sources.set(n, { n, title: part.title ?? part.url, url: part.url });
    }
    return [...sources.values()].sort((a, b) => a.n - b.n);
}
