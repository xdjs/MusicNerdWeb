"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import {
  interviewSessionStateSchema,
  type InterviewSessionState,
} from "@/lib/interviewApi/sessionSchemas";
import type { InterviewRequest } from "@/lib/interviewApi/interviewRequestSchema";
import ApiInterviewQuestion from "./ApiInterviewQuestion";
import ApiInterviewBoundaries from "./ApiInterviewBoundaries";
/** Explicit interview actions backed by API sessions; mounting only restores saved state. */
export default function ApiInterview({
  artistId,
  artistName,
}: {
  artistId: string;
  artistName: string;
}) {
  const { ready, authenticated, user, getAccessToken } = usePrivy();
  const scope = `${artistId}:${user?.id ?? ""}`;
  const life = useRef<AbortController | null>(null),
    pending = useRef(false),
    startId = useRef<string | null>(null);
  const [stored, setStored] = useState<{
    scope: string;
    state: InterviewSessionState;
  } | null>(null);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const state = stored?.scope === scope ? stored.state : null;
  const call = useCallback(
    async (body?: InterviewRequest, signal?: AbortSignal) => {
      const token = await getAccessToken();
      if (!token) throw new Error("Sign in to continue the interview.");
      signal?.throwIfAborted();
      const r = await fetch(`/api/artist/${artistId}/interview`, {
        method: body ? "POST" : "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal,
        cache: "no-store",
      });
      const result = await r.json();
      if (!r.ok)
        throw new Error(
          typeof result.error === "string"
            ? result.error
            : "The interview could not be loaded.",
        );
      return result as unknown;
    },
    [artistId, getAccessToken],
  );
  const restore = useCallback(
    async (signal: AbortSignal) => {
      const result = interviewSessionStateSchema.parse(
        await call(undefined, signal),
      );
      if (!signal.aborted) setStored({ scope, state: result });
    },
    [call, scope],
  );
  useEffect(() => {
    const controller = new AbortController();
    life.current = controller;
    pending.current = false;
    startId.current = null;
    setStored(null);
    setError(null);
    setBusy(false);
    setPreparing(false);
    setLoading(true);
    if (ready && authenticated)
      void restore(controller.signal)
        .catch((e) => {
          if (!controller.signal.aborted)
            setError(
              e instanceof Error
                ? e.message
                : "The interview could not be loaded.",
            );
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    return () => controller.abort();
  }, [ready, authenticated, restore]);
  const mutate = async (action: InterviewRequest) => {
    const controller = life.current;
    if (!controller || controller.signal.aborted || pending.current)
      return false;
    pending.current = true;
    setBusy(true);
    setError(null);
    setPreparing(action.action === "start" || action.action === "continue");
    try {
      const result = interviewSessionStateSchema.parse(
        await call(action, controller.signal),
      );
      if (controller.signal.aborted) return false;
      setStored({ scope, state: result });
      return true;
    } catch (e) {
      if (!controller.signal.aborted) {
        setError(e instanceof Error ? e.message : "The interview step failed.");
        if (action.action === "start")
          await restore(controller.signal).catch(() => undefined);
      }
      return false;
    } finally {
      if (!controller.signal.aborted) {
        pending.current = false;
        setBusy(false);
        setPreparing(false);
      }
    }
  };
  const reload = async () => {
    const controller = life.current;
    if (!controller || busy) return;
    setLoading(true);
    setError(null);
    try {
      await restore(controller.signal);
    } catch (e) {
      if (!controller.signal.aborted)
        setError(
          e instanceof Error ? e.message : "The interview could not be loaded.",
        );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };
  if (!ready || !authenticated) return null;
  const session = state?.session,
    legacy = state?.legacyOffers ?? [];
  const offered =
    legacy[0] ?? session?.questions.find((q) => q.state === "offered");
  const origin = offered ?? session?.questions.at(-1);
  const button =
    "min-h-11 rounded-lg border border-black/15 px-4 py-2 text-sm disabled:opacity-50 dark:border-white/20";
  return (
    <section
      aria-label={`Interview with ${artistName}`}
      className="rounded-2xl border border-black/10 bg-white p-4 text-neutral-900 dark:border-white/15 dark:bg-neutral-950 dark:text-white sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Your music, in your words</h2>
        <button
          type="button"
          className={button}
          disabled={busy || loading}
          onClick={() => void reload()}
        >
          Reload saved interview
        </button>
      </div>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
        Questions from your sources and what you’ve shared. Answer at your pace;
        saved answers and questions stay here when you return.
      </p>
      {loading && (
        <p role="status" className="mt-3 text-sm">
          Loading your saved interview…
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-amber-600/40 p-3 text-sm"
        >
          {error}
        </p>
      )}
      {busy && (
        <p role="status" className="mt-3 text-sm">
          {preparing
            ? "Preparing a question from your sources and previous answers…"
            : "Saving your interview…"}
        </p>
      )}
      {!loading && state && (
        <div className="mt-5 space-y-4">
          {offered ? (
            <ApiInterviewQuestion
              key={`${scope}:${offered.id}`}
              question={offered}
              busy={busy}
              call={(body) => call(body, life.current?.signal)}
              onAnswer={(answer) =>
                mutate({
                  action: "answer",
                  answerId: offered.id,
                  expectedRevision: offered.revision,
                  answer,
                })
              }
            />
          ) : session?.state === "active" ? (
            <>
              <p className="text-sm">
                {session.questions.length >= 3
                  ? "That’s three questions for this sitting."
                  : "Your answer is saved. Continue when you’re ready."}
              </p>
              {session.questions.length < 3 && (
                <button
                  type="button"
                  className={button}
                  disabled={busy}
                  onClick={() =>
                    void mutate({ action: "continue", sessionId: session.id })
                  }
                >
                  Continue interview
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              className={button}
              disabled={busy}
              onClick={() => {
                startId.current ??= crypto.randomUUID();
                void mutate({ action: "start", requestId: startId.current });
              }}
            >
              Start interview
            </button>
          )}
          {session?.state === "active" && (
            <div>
              <button
                type="button"
                className={button}
                disabled={busy}
                onClick={() =>
                  void mutate({ action: "finish", sessionId: session.id })
                }
              >
                Finish interview
              </button>
              {offered && (
                <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                  Finishing skips the unanswered question. You can also leave
                  and return to it later.
                </p>
              )}
            </div>
          )}
          {origin && (
            <ApiInterviewBoundaries
              key={`${scope}:${session?.id ?? "legacy"}`}
              questionKey={origin.questionKey}
              busy={busy}
              call={(body) => call(body, life.current?.signal)}
            />
          )}
          {!!session?.questions.some((q) => q.state !== "offered") && (
            <details className="border-t border-black/10 pt-3 dark:border-white/15">
              <summary className="min-h-11 cursor-pointer py-2 text-sm">
                Saved in this sitting
              </summary>
              <ol className="space-y-4">
                {session.questions
                  .filter((q) => q.state !== "offered")
                  .map((q) => (
                    <li key={q.id}>
                      <p className="text-sm font-medium">{q.question}</p>
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-neutral-600 dark:text-neutral-300">
                        {q.answer ?? "Skipped"}
                      </p>
                    </li>
                  ))}
              </ol>
            </details>
          )}
        </div>
      )}
    </section>
  );
}
