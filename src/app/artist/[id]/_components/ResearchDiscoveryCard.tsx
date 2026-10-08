"use client";
import { useEffect, useRef, useState } from "react";
import { callPrivateResearch } from "@/lib/questionResearch/callPrivateResearch";
import {
  researchReadSchema,
  discoverySchema,
  type ResearchDiscovery,
} from "@/lib/questionResearch/schemas";
/** Exact original review. Titles are navigation labels; the artist decides from the original. */
export default function ResearchDiscoveryCard({
  artistId,
  candidate,
  onReviewed,
}: {
  artistId: string;
  candidate: ResearchDiscovery;
  onReviewed: (id: string) => void;
}) {
  const [text, setText] = useState<string | null>(null),
    [next, setNext] = useState<number | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const [provenance, setProvenance] = useState<string | null>(null);
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);
  const read = async (start = 0) => {
    active.current?.abort();
    const c = new AbortController();
    active.current = c;
    setBusy(true);
    setError(null);
    try {
      const r = researchReadSchema.parse(
        await callPrivateResearch(
          `/api/artist/${artistId}/research/evidence/discovery%3A${candidate.evidenceId}?revision=${candidate.revision}&start=${start}&maxChars=12000`,
          { signal: c.signal },
        ),
      );
      if (
        r.passage.revision !== candidate.revision ||
        r.passage.sourceId !== `discovery:${candidate.evidenceId}`
      )
        throw new Error("The original changed. Reload discoveries.");
      if (!c.signal.aborted) {
        setProvenance(
          `${r.passage.evidenceKind === "provider_transcript" ? "Provider transcript; speaker unverified" : r.passage.evidenceKind === "caption" ? "Post caption" : "Original page text"}${r.passage.publishedAt ? ` · Published/uploaded ${r.passage.publishedAt.slice(0, 10)}` : ""}`,
        );
        setText((old) =>
          start === 0 ? r.passage.text : (old ?? "") + r.passage.text,
        );
        setNext(r.nextStart);
      }
    } catch (e) {
      if (!c.signal.aborted)
        setError(e instanceof Error ? e.message : "Original unavailable");
    } finally {
      if (!c.signal.aborted) setBusy(false);
    }
  };
  const review = async (
    decision: "approve" | "decline" | "wrong_artist" | "incorrect",
  ) => {
    const c = new AbortController();
    active.current = c;
    setBusy(true);
    setError(null);
    try {
      const result = (await callPrivateResearch(
        `/api/artist/${artistId}/research/discoveries/${candidate.id}/review`,
        { body: { revision: candidate.revision, decision }, signal: c.signal },
      )) as { candidate?: unknown };
      const reviewed = discoverySchema.parse(result.candidate);
      if (reviewed.id !== candidate.id || reviewed.curation === "pending")
        throw new Error("The review was not saved.");
      if (!c.signal.aborted) onReviewed(candidate.id);
    } catch (e) {
      if (!c.signal.aborted)
        setError(e instanceof Error ? e.message : "Review unavailable");
    } finally {
      if (!c.signal.aborted) setBusy(false);
    }
  };
  const button =
    "min-h-11 rounded-lg border border-black/20 px-3 text-sm disabled:opacity-40 dark:border-white/20";
  return (
    <article className="space-y-3 rounded-xl border border-black/15 p-4 text-black dark:border-white/15 dark:text-white">
      <a
        href={candidate.url}
        target="_blank"
        rel="noopener noreferrer"
        className="break-words font-medium underline underline-offset-4"
      >
        {candidate.title ?? candidate.url}
      </a>
      <p className="break-all text-xs text-muted-foreground">{candidate.url}</p>
      <p className="text-sm text-muted-foreground">
        Found while researching{" "}
        {candidate.reason === "credits"
          ? "credits"
          : candidate.reason === "release_date"
            ? "release dates"
            : "public sources"}
        .{" "}
        {candidate.identity === "unresolved"
          ? "Check that this is about you."
          : "Identity matched; please check the original."}
      </p>
      <p className="text-xs text-muted-foreground">
        Not yet in your {candidate.destination === "lore" ? "Lore" : "Links"}.
      </p>
      {text === null ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void read()}
          className={button}
        >
          Read original
        </button>
      ) : (
        <>
          <blockquote className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg bg-black/5 p-3 text-sm leading-relaxed dark:bg-white/5">
            {text}
          </blockquote>
          {next !== null && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void read(next)}
              className={button}
            >
              Read more of the original
            </button>
          )}
        </>
      )}
      {provenance && (
        <p className="text-xs text-muted-foreground">
          {provenance}. Publication timing does not establish when an event
          happened.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
      {busy && (
        <p role="status" className="text-sm text-muted-foreground">
          Working…
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={button}
          disabled={busy || text === null}
          onClick={() => void review("approve")}
        >
          {candidate.destination === "lore" ? "Add to Lore" : "Add link"}
        </button>
        <button
          type="button"
          className={button}
          disabled={busy}
          onClick={() => void review("decline")}
        >
          Pass
        </button>
        <button
          type="button"
          className={button}
          disabled={busy}
          onClick={() => void review("wrong_artist")}
        >
          Wrong artist
        </button>
        <button
          type="button"
          className={button}
          disabled={busy || text === null}
          onClick={() => void review("incorrect")}
        >
          Incorrect information
        </button>
      </div>
    </article>
  );
}
