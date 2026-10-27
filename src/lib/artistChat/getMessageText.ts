import type { UIMessage } from "ai";

/**
 * A chat message's text: its `text` parts joined, every other part skipped.
 *
 * @param message - A `useChat` message, or none.
 * @returns The text, or `""`.
 */
export function getMessageText(message: UIMessage | undefined): string {
    return (message?.parts ?? []).map(part => part.type === "text" ? part.text : "").join("");
}
