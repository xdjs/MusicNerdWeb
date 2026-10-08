"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import { requestInterviewResponses } from "@/lib/interviewResponses/requestInterviewResponses";
import {
  responseListSchema,
  type InterviewResponse,
} from "@/lib/interviewResponses/types";
import InterviewResponseCard from "./InterviewResponseCard";

/** Only the authenticated editor can fetch private interview history. Account changes clear the view. */
export default function ArtistInterviews({ artistId }: { artistId: string }) {
  const { ready, authenticated, user } = usePrivy();
  if (!ready)
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Loading your account…
      </p>
    );
  if (!authenticated || !user)
    return (
      <p className="text-sm text-muted-foreground">
        Sign in to review your interviews.
      </p>
    );
  return <InterviewPages key={`${artistId}:${user.id}`} artistId={artistId} />;
}

function InterviewPages({ artistId }: { artistId: string }) {
  const [pages, setPages] = useState<
    { responses: InterviewResponse[]; nextCursor: string | null }[]
  >([]);
  const [page, setPage] = useState(0);
  const [records, setRecords] = useState<InterviewResponse[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const load = useCallback(
    async (cursor?: string, destination = 0) => {
      controller.current?.abort();
      const abort = new AbortController();
      controller.current = abort;
      setBusy(true);
      setError("");
      try {
        const result = await requestInterviewResponses(
          artistId,
          `?limit=5${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
          responseListSchema,
          { signal: abort.signal },
        );
        if (!mounted.current || abort.signal.aborted) return;
        setPages((previous) => cursor ? [...previous, result] : [result]);
        setPage(destination);
        setRecords((previous) => [
          ...previous,
          ...result.responses.filter(
            (row) => !previous.some((existing) => existing.id === row.id),
          ),
        ]);
      } catch (e) {
        if (mounted.current && !abort.signal.aborted) {
          setError(
            e instanceof Error ? e.message : "Could not load interviews.",
          );
          if (
            e &&
            typeof e === "object" &&
            "status" in e &&
            [401, 403].includes(Number(e.status))
          ) {
            setPages([]);
            setRecords([]);
          }
        }
      } finally {
        if (mounted.current && !abort.signal.aborted) setBusy(false);
      }
    },
    [artistId],
  );
  useEffect(() => {
    mounted.current = true;
    void load();
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, [load]);
  const current = pages[page];
  return (
    <section className="space-y-4" aria-label="Your interviews">
      <div>
        <h3 className="text-base font-semibold text-foreground">
          Your interviews
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Review the questions you answered and update your words when something
          needs correcting.
        </p>
      </div>
      {busy && (
        <p role="status" className="text-sm text-muted-foreground">
          Loading saved responses…
        </p>
      )}
      {error && (
        <div className="space-y-2">
          <p role="alert" className="text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
          <Button type="button" variant="glass" onClick={() => void load()}>
            {pages.length ? "Refresh question list" : "Try again"}
          </Button>
        </div>
      )}
      {!busy && !error && current?.responses.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No saved interview responses yet. Responses from your Music Nerd
          interviews will appear here.
        </p>
      )}
      <div className="space-y-3">
        {records.map((response) => (
          <div
            key={response.id}
            hidden={!current?.responses.some((row) => row.id === response.id)}
          >
            <InterviewResponseCard artistId={artistId} response={response} />
          </div>
        ))}
      </div>
      {current && pages.some((group) => group.responses.length > 0) && (
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="glass"
            size="sm"
            disabled={busy || page === 0}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">Page {page + 1}</span>
          <Button
            type="button"
            variant="glass"
            size="sm"
            disabled={busy || (!pages[page + 1] && !current.nextCursor)}
            onClick={() => {
              if (pages[page + 1]) setPage(page + 1);
              else if (current.nextCursor) void load(current.nextCursor, pages.length);
            }}
          >
            Next
          </Button>
        </div>
      )}
    </section>
  );
}
