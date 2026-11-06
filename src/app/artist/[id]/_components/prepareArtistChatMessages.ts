import type { UIMessage } from "ai";
import { getAttributedAnswer } from "./getAttributedAnswer";

/** Prior display order is untrusted navigation only; no quotation becomes fresh evidence. */
export function prepareArtistChatMessages(messages: UIMessage[]): UIMessage[] {
  return messages.map(message => {
    if (message.role !== "assistant") return message;
    // Inspect ORIGINAL parts first, preserving the existing whole-message PDF privacy strip.
    if (message.parts.some(part => part.type === "tool-readPdfSource" || part.type === "tool-readNamedPdf"))
      return { id: message.id, role: message.role, parts: [] };
    const answer = getAttributedAnswer(message);
    if (!answer) return message;
    return {
      id: message.id,
      role: message.role,
      parts: [
        ...(answer.navigationParts ?? []),
        { type: "data-attributed-status", data: { version: 1, state: answer.state, selectionMayBeIncomplete: true, pdfTextUnavailable: answer.pdfTextUnavailable } },
      ],
    };
  });
}
