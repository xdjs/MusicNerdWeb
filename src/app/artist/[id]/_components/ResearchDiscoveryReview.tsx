"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { callPrivateResearch } from "@/lib/questionResearch/callPrivateResearch";
import {
  discoveriesSchema,
  type ResearchDiscovery,
} from "@/lib/questionResearch/schemas";
import ResearchDiscoveryCard from "./ResearchDiscoveryCard";
/** Read-only on mount. Collection and promotion happen only through explicit questions/decisions. */
export default function ResearchDiscoveryReview({
  artistId,
}: {
  artistId: string;
}) {
  const [items, setItems] = useState<ResearchDiscovery[]>([]),
    [next, setNext] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [loaded, setLoaded] = useState(false);
  const active = useRef<AbortController | null>(null);
  const load = useCallback(
    async (cursor?: string) => {
      active.current?.abort();
      const c = new AbortController();
      active.current = c;
      setBusy(true);
      setError(null);
      try {
        const r = discoveriesSchema.parse(
          await callPrivateResearch(
            `/api/artist/${artistId}/research/discoveries?limit=10${cursor ? `&cursor=${cursor}` : ""}`,
            { signal: c.signal },
          ),
        );
        if (!c.signal.aborted) {
          setItems((old) =>
            cursor
              ? [
                  ...old,
                  ...r.candidates.filter(
                    (v) => !old.some((o) => o.id === v.id),
                  ),
                ]
              : r.candidates,
          );
          setNext(r.nextCursor);
          setLoaded(true);
        }
      } catch (e) {
        if (!c.signal.aborted)
          setError(e instanceof Error ? e.message : "Discoveries unavailable");
      } finally {
        if (!c.signal.aborted) setBusy(false);
      }
    },
    [artistId],
  );
  useEffect(() => {
    setItems([]);
    setLoaded(false);
    void load();
    return () => active.current?.abort();
  }, [load]);
  return (
    <section
      aria-label="Research discoveries"
      className="space-y-3 border-t border-black/10 pt-4 dark:border-white/10"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-medium text-black dark:text-white">
          Discovered for your Lore
        </h3>
        <button
          type="button"
          disabled={busy}
          className="min-h-11 text-sm underline underline-offset-4 text-black dark:text-white"
          onClick={() => void load()}
        >
          Reload discoveries
        </button>
      </div>
      <p className="text-sm text-muted-foreground">
        Review originals found during public research. You choose what becomes
        part of your Lore or Links.
      </p>
      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
      {busy && (
        <p role="status" className="text-sm text-muted-foreground">
          Loading discoveries…
        </p>
      )}
      {loaded && !items.length && !busy && (
        <p className="text-sm text-muted-foreground">
          No discoveries waiting for review.
        </p>
      )}
      {items.map((candidate) => (
        <ResearchDiscoveryCard
          key={`${candidate.id}:${candidate.revision}`}
          artistId={artistId}
          candidate={candidate}
          onReviewed={(id) => setItems((old) => old.filter((v) => v.id !== id))}
        />
      ))}
      {next && (
        <button
          type="button"
          disabled={busy}
          className="min-h-11 text-sm underline text-black dark:text-white"
          onClick={() => void load(next)}
        >
          More discoveries
        </button>
      )}
    </section>
  );
}
