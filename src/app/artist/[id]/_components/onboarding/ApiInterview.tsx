"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { MessageCircleQuestion } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import {
  interviewSessionStateSchema,
  type InterviewSessionState,
} from "@/lib/interviewApi/sessionSchemas";
import type { InterviewRequest } from "@/lib/interviewApi/interviewRequestSchema";
import ApiInterviewQuestion from "./ApiInterviewQuestion";
import ApiInterviewBoundaries from "./ApiInterviewBoundaries";
import dialogStyles from "./ApiInterviewDialog.module.css";
/** Explicit interview actions backed by API sessions; mounting only restores saved state. */
export default function ApiInterview({
  artistId,
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
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{ key: string; text: string } | null>(null);
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
    setOpen(false);
    setDraft(null);
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
      if (action.action === "finish") startId.current = null;
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
  const session = state?.session,
    legacy = state?.legacyOffers ?? [];
  const offered =
    legacy[0] ?? session?.questions.find((q) => q.state === "offered");
  const origin = offered ?? session?.questions.at(-1);
  const draftKey = offered ? `mn-api-interview-draft:${JSON.stringify([scope, offered.id])}` : null;
  useEffect(() => {
    if (!draftKey || !offered) return;
    try {
      const text = localStorage.getItem(draftKey);
      if (text !== null) setDraft({ key: `${scope}:${offered.id}`, text });
    } catch { /* The current in-memory draft remains available. */ }
  }, [draftKey, offered, scope]);
  const keepDraft = (text: string) => {
    if (!offered || !draftKey) return;
    setDraft({ key: `${scope}:${offered.id}`, text });
    try {
      if (text) localStorage.setItem(draftKey, text);
      else localStorage.removeItem(draftKey);
    } catch { setError("Your draft could not be saved in this browser. Keep this interview open until you send it."); }
  };
  const close = () => {
    if (pending.current) return;
    if (draftKey && draft?.key === `${scope}:${offered?.id}`) {
      try {
        if (draft.text) localStorage.setItem(draftKey, draft.text);
        else localStorage.removeItem(draftKey);
      } catch { setError("Your draft could not be saved in this browser. Keep this interview open until you send it."); return; }
    }
    setOpen(false);
  };
  if (!ready || !authenticated) return null;
  const button =
    "min-h-11 rounded-xl button-pink bg-highlightpink px-4 py-2.5 text-sm font-semibold text-[#111] transition-colors hover:bg-highlightpink/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pastypink disabled:opacity-40";
  const start = () => {
    startId.current ??= crypto.randomUUID();
    void mutate({ action: "start", requestId: startId.current });
  };
  return (
    <Dialog open={open && (!!state || !!error)} onOpenChange={(next) => { if (!next) close(); }}>
      <DialogTrigger asChild>
        <button type="button"
          className="button-glass inline-flex min-h-11 items-center gap-2 rounded-lg border border-black/15 bg-black/[0.03] px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-black/5 dark:border-white/20 dark:bg-white/10 dark:hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pastypink disabled:opacity-40"
          disabled={loading || busy}
          onClick={() => { setOpen(true); if (state && !offered && session?.state !== "active") start(); }}>
          <MessageCircleQuestion size={18} aria-hidden="true" />
          {loading ? "Loading interview…" : session?.state === "active" || offered ? "Resume interview" : "Start interview"}
        </button>
      </DialogTrigger>
        <DialogContent aria-busy={busy}
          onEscapeKeyDown={(event) => { if (pending.current) event.preventDefault(); }}
          onPointerDownOutside={(event) => { if (pending.current) event.preventDefault(); }}
          className={`${dialogStyles.dialog} mn-themed-dialog artist-link-panel max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-xl overflow-hidden rounded-2xl border-white/15 bg-neutral-950/80 bg-gradient-to-br from-white/[0.08] via-transparent to-white/[0.02] p-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl backdrop-saturate-150 dark:bg-neutral-950/80 sm:rounded-2xl sm:p-6`}>
          <DialogHeader className="shrink-0 space-y-1.5 pr-7 text-left">
            <DialogTitle className="text-xl font-semibold leading-snug tracking-tight">A few questions</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-muted-foreground dark:text-white/60">
              Tell your story in your own words. Answer at your pace, and skip anything you’d rather not discuss.
            </DialogDescription>
          </DialogHeader>
          <div className={`${dialogStyles.body} pt-3 pb-6 pr-1`}>
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
        <div className="space-y-3">
          {offered ? (
            <ApiInterviewQuestion
              key={`${scope}:${offered.id}`}
              question={offered}
              answer={draft?.key === `${scope}:${offered.id}` ? draft.text : ""}
              onAnswerChange={keepDraft}
              busy={busy}
              call={(body) => call(body, life.current?.signal)}
              onAnswer={async (answer) => {
                const saved = await mutate({
                  action: "answer",
                  answerId: offered.id,
                  expectedRevision: offered.revision,
                  answer,
                });
                if (saved && draftKey) {
                  setDraft(null);
                  try { localStorage.removeItem(draftKey); } catch { /* The saved answer remains authoritative. */ }
                }
                return saved;
              }}
            />
          ) : session?.state === "active" ? (
            <>
              <p className="text-sm">
                {session.questions.length >= 3
                  ? "That’s three questions for this sitting."
                  : session.questions.length === 0
                    ? "Your sitting is open. Continue to prepare the first question."
                    : "Your response is saved. Continue when you’re ready."}
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
              onClick={start}
            >
              Start interview
            </button>
          )}
          {session?.state === "active" && (
            <div>
              <button
                type="button"
                className="min-h-11 rounded-xl border border-input bg-black/[0.03] px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-black/5 dark:border-white/20 dark:bg-white/5 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pastypink disabled:opacity-40"
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
          {(session || origin) && (
            <ApiInterviewBoundaries
              key={`${scope}:${session?.id ?? "legacy"}`}
              questionKey={origin?.questionKey ?? null}
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
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-500 dark:text-gray-400">
                        {q.answer ?? "Skipped"}
                      </p>
                    </li>
                  ))}
              </ol>
            </details>
          )}
        </div>
      )}
          </div>
          <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-black/10 pt-3 dark:border-white/15">
            <button type="button" disabled={busy} onClick={close} className="min-h-11 rounded-xl border border-input bg-black/[0.03] px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-black/5 dark:border-white/20 dark:bg-white/5 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pastypink disabled:opacity-40">Save for later</button>
            <button type="button" disabled={busy || loading} onClick={() => void reload()} className="min-h-11 rounded-xl border border-input bg-black/[0.03] px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-black/5 dark:border-white/20 dark:bg-white/5 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pastypink disabled:opacity-40">Reload saved interview</button>
          </div>
        </DialogContent>
    </Dialog>
  );
}
