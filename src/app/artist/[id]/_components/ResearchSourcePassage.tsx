"use client";
import { useEffect, useRef, useState } from "react";
import { researchReadSchema } from "@/lib/questionResearch/schemas";
/** Read the exact stored revision on demand; opening a citation never starts research. */
export default function ResearchSourcePassage({
  artistId,
  source,
}: {
  artistId: string;
  source: {
    n: number;
    sourceId?: string;
    revision?: string;
    start?: number;
    curation?: string;
  };
}) {
  const [open, setOpen] = useState(false),
    [text, setText] = useState<string | null>(null),
    [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  if (!source.sourceId || !source.revision) return null;
  const read = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (text !== null) return;
    controller.current?.abort();
    const c = new AbortController();
    controller.current = c;
    setError(null);
    try {
      const q = new URLSearchParams({
        sourceId: source.sourceId!,
        revision: source.revision!,
        start: String(source.start ?? 0),
      });
      const response = await fetch(
        `/api/artist/${artistId}/questionResearch/source?${q}`,
        { signal: c.signal, cache: "no-store" },
      );
      if (!response.ok)
        throw new Error(
          "This original changed or is no longer available. Refresh the research.",
        );
      const original = researchReadSchema.parse(await response.json());
      setText(original.passage.text);
    } catch (e) {
      if (!c.signal.aborted)
        setError(e instanceof Error ? e.message : "Original unavailable");
    }
  };
  return (
    <div className="text-xs text-white/70">
      <button
        type="button"
        onClick={() => void read()}
        aria-expanded={open}
        className="min-h-11 underline underline-offset-4"
      >
        Read passage [{source.n}]
      </button>
      {source.curation === "pending" && (
        <span className="ml-2">Awaiting artist review</span>
      )}
      {open && (
        <div className="max-h-64 overflow-y-auto rounded-lg border border-white/15 p-3">
          {error ? (
            <p role="alert">{error}</p>
          ) : text === null ? (
            <p role="status">Opening the original…</p>
          ) : (
            <blockquote className="whitespace-pre-wrap">{text}</blockquote>
          )}
        </div>
      )}
    </div>
  );
}
