"use client";
import { useState } from "react";
import type { InterviewReference } from "@/lib/interviewApi/interviewPlanSchemas";
import type { InterviewRequest } from "@/lib/interviewApi/interviewRequestSchema";
import { knowledgeOutputSchemas } from "@/lib/interviewApi/knowledgeOutputSchemas";
/** Read the exact original context on demand; titles never stand in for its contents. */
export default function ApiInterviewEvidence({
  reference,
  call,
}: {
  reference: InterviewReference;
  call: (body: InterviewRequest) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false),
    [passage, setPassage] = useState<{
      text: string;
      url: string | null;
      kind: string;
    } | null>(null),
    [error, setError] = useState<string | null>(null),
    [loading, setLoading] = useState(false);
  const read = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (reference.kind === "answer" || passage) return;
    setLoading(true);
    setError(null);
    try {
      const r = knowledgeOutputSchemas.read.parse(
        await call({
          action: "source",
          sourceId: reference.sourceId,
          revision: reference.revision,
          start: reference.start,
        }),
      );
      setPassage({
        text: r.passage.text,
        url: r.passage.source.url,
        kind: r.passage.source.kind,
      });
    } catch {
      setError(
        "This original could not be opened. Its saved supporting quote remains below.",
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="rounded-lg border border-black/10 px-3 dark:border-white/15">
      <button
        type="button"
        aria-expanded={open}
        className="min-h-11 text-left text-sm underline underline-offset-4"
        onClick={() => void read()}
      >
        {reference.kind === "answer"
          ? "Read the earlier answer excerpt"
          : "Read the supporting original"}
      </button>
      {open && (
        <div className="space-y-2 pb-3 text-sm">
          <blockquote className="whitespace-pre-wrap break-words border-l-2 border-black/20 pl-3 dark:border-white/30">
            {reference.quote}
          </blockquote>
          {loading && <p role="status">Opening the original context…</p>}
          {error && <p role="alert">{error}</p>}
          {passage && (
            <>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {passage.kind === "social_caption"
                  ? "Post caption"
                  : passage.kind === "reel_transcript"
                    ? "Provider transcript · speaker not verified"
                    : "Saved source text"}
                {passage.url && (
                  <>
                    {" "}
                    ·{" "}
                    <a
                      href={passage.url}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      Open source
                    </a>
                  </>
                )}
              </p>
              <div className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-relaxed">
                {passage.text}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
