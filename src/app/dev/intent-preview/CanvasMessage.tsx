import type { UIMessage } from "ai";
import { getChatSources } from "@/lib/artistChat/getChatSources";
import { getMessageText } from "@/lib/artistChat/getMessageText";
/** Reuse the chat's citation evidence; never turn unverified model text into a link. */
export default function CanvasMessage({
  message,
  explanation,
}: {
  message: UIMessage;
  explanation?: string;
}) {
  const sources = getChatSources(
    explanation
      ? {
          ...message,
          parts: [
            ...message.parts.filter((p) => p.type !== "text"),
            { type: "text", text: explanation },
          ],
        }
      : message,
  );
  const text = (explanation ?? getMessageText(message)).replace(/\*\*?/g, "");
  return (
    <p>
      {text.split(/(\[\d+(?:,\s*\d+)*\])/g).map((part, index) => {
        if (!/^\[\d/.test(part)) return part;
        return (
          <sup key={index}>
            {part
              .slice(1, -1)
              .split(",")
              .map((n) => {
                const source = sources.find((s) => s.n === Number(n.trim()));
                return source && /^https?:\/\//.test(source.url) ? (
                  <a
                    key={n}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    title={source.title}
                  >
                    [{n.trim()}]
                  </a>
                ) : null;
              })}
          </sup>
        );
      })}
    </p>
  );
}
