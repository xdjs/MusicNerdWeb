"use client";
import { useEffect, useRef, useState } from "react";
import { formatLatestSourceDetails } from "@/lib/questionResearch/formatLatestSourceDetails";
import { readSourceDetails } from "@/lib/questionResearch/readSourceDetails";
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
    [error, setError] = useState<string | null>(null),
    [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  if (!source.sourceId || !source.revision) return null;
  const structured = source.sourceId.startsWith("latest:");
  const details =
    text === null ? null : formatLatestSourceDetails(source.sourceId, text);
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
      const original = await readSourceDetails(artistId, {
        sourceId: source.sourceId!, revision: source.revision!, start: source.start,
      }, c.signal);
      setText(original.text);
      setSourceUrl(original.url);
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
        {structured ? "Source details" : "Read passage"} [{source.n}]
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
          ) : structured ? (
            <div className="space-y-3">
              {details ? (
                <dl className="space-y-2">
                  {details.map(({ label, value }) => (
                    <div key={label}>
                      <dt className="text-white/50">{label}</dt>
                      <dd className="whitespace-pre-wrap break-words text-white/90">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p>Source details aren’t available here.</p>
              )}
              {sourceUrl && (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center underline underline-offset-4"
                >
                  Open original source ↗
                </a>
              )}
            </div>
          ) : (
            <blockquote className="whitespace-pre-wrap">{text}</blockquote>
          )}
        </div>
      )}
    </div>
  );
}
