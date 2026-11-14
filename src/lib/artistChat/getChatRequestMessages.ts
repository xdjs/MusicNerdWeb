import type { UIMessage } from "ai";

/**
 * The conversation as the chat endpoint takes it: each message with only its
 * `text` and `tool-*` parts, both passed through unchanged. Those are all
 * MusicNerdAPI reads from a replayed turn (the text, PDF reads, and the
 * `documents` a `searchPassages` or `readUnits` output numbered, which keep
 * `[n]` meaning the same document across turns). Source parts, step markers and
 * reasoning are left out: the API ignores them, and it rejects any message with
 * more than 64 parts, which the `source-url` parts a units-mode answer re-sends
 * for every earlier document soon exceed.
 *
 * @param messages - `useChat`'s messages.
 * @returns The messages to send.
 */
export function getChatRequestMessages(messages: UIMessage[]): UIMessage[] {
    return messages.map(message => ({
        ...message,
        parts: message.parts.filter(part => part.type === "text" || part.type.startsWith("tool-")),
    }));
}
