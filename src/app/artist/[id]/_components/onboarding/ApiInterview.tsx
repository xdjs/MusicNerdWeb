"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { MessageCircleQuestion, LoaderCircle, MessageSquare, SlidersHorizontal, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePrivy } from "@privy-io/react-auth";
import { musicNerdApiUrl } from "@/lib/musicNerdApi/musicNerdApiUrl";
import {
  interviewSessionStateSchema,
  type InterviewSessionState,
} from "@/lib/interviewApi/sessionSchemas";
import type { InterviewRequest } from "@/lib/interviewApi/interviewRequestSchema";
import InterviewResponseCard from "../InterviewResponseCard";
import ApiInterviewQuestion from "./ApiInterviewQuestion";
import ApiInterviewBoundaries from "./ApiInterviewBoundaries";
import dialogStyles from "./ApiInterviewDialog.module.css";
import { useInterviewAnswerQueue } from "./useInterviewAnswerQueue";
import { useResearchPump } from "./useResearchPump";
/** Explicit interview actions backed by API sessions; mounting only restores saved state. */
export default function ApiInterview({
  artistId,
}: {
  artistId: string;
  artistName: string;
}) {
  const { ready, authenticated, user, getAccessToken } = usePrivy();
  const { toast } = useToast();
  const scope = `${artistId}:${user?.id ?? ""}`;
  const unsavedResponses = useRef(new Set<string>());
  const trackUnsavedResponse = useCallback((id: string, unsaved: boolean) => {
    if (unsaved) unsavedResponses.current.add(id);
    else unsavedResponses.current.delete(id);
  }, []);
  const life = useRef<AbortController | null>(null),
    pending = useRef(false),
    startId = useRef<string | null>(null),
    revision = useRef(0),
    readId = useRef(0),
    refreshing = useRef(false);
  const [stored, setStored] = useState<{
    scope: string;
    state: InterviewSessionState;
  } | null>(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"interview" | "preferences" | "responses">("interview");
  const [draft, setDraft] = useState<{ key: string; text: string } | null>(null);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [opening, setOpening] = useState(false);
  const serverState = stored?.scope === scope ? stored.state : null;

  const call = useCallback(
    async (body?: InterviewRequest, signal?: AbortSignal) => {
      const token = await getAccessToken();
      if (!token) throw new Error("Sign in to continue the interview.");
      signal?.throwIfAborted();
      const r = await fetch(musicNerdApiUrl(`/api/artist/${artistId}/interview`), {
        method: body ? "POST" : "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal,
        credentials: "omit",
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
  const confirmAnswer = useCallback((result: InterviewSessionState) => {
    revision.current++;
    setStored({ scope, state: result });
  }, [scope]);
  const answers = useInterviewAnswerQueue(scope, call, confirmAnswer);
  const state = serverState && {
    ...serverState,
    session: serverState.session && {
      ...serverState.session,
      questions: serverState.session.questions.map((question) => {
        const intent = answers.entries.find((entry) => entry.answerId === question.id);
        return intent ? { ...question, answer: intent.answer, state: intent.answer === null ? "skipped" as const : "answered" as const } : question;
      }),
    },
  };
  const preparationStatus = state?.preparation?.status;
  const queued = preparationStatus === "pending" || preparationStatus === "running";
  const restore = useCallback(
    async (signal: AbortSignal) => {
      const observedRevision = revision.current;
      const id = ++readId.current;
      const result = interviewSessionStateSchema.parse(
        await call(undefined, signal),
      );
      if (!signal.aborted && observedRevision === revision.current && id === readId.current) setStored({ scope, state: result });
    },
    [call, scope],
  );
  const refreshPreparation = useCallback(async () => {
    const controller = life.current;
    if (!controller || controller.signal.aborted || refreshing.current) return;
    refreshing.current = true;
    try {
      await restore(controller.signal);
      if (!controller.signal.aborted) setError((previous) => previous?.startsWith("We couldn’t check preparation") ? null : previous);
    } catch {
      if (!controller.signal.aborted) setError("We couldn’t check preparation. Your saved interview is safe; reconnect or reload to check again.");
    } finally {
      refreshing.current = false;
    }
  }, [restore]);
  useResearchPump(artistId, queued, refreshPreparation, "interview_prepare");
  useEffect(() => {
    if (!queued) return;
    const interval = setInterval(() => { void refreshPreparation(); }, 3000);
    return () => clearInterval(interval);
  }, [queued, refreshPreparation]);
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
    setOpening(false);
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
    if (action.action === "finish" && unsavedResponses.current.size) {
      setView("responses");
      toast({ title: "Your edit is still open", description: "Save or cancel your response edit before finishing." });
      return;
    }
    const controller = life.current;
    if (!controller || controller.signal.aborted || pending.current)
      return false;
    pending.current = true;
    revision.current++;
    setBusy(true);
    setError(null);
    setPreparing(action.action === "start" || action.action === "prepare");
    setOpening(action.action === "continue");
    try {
      const result = interviewSessionStateSchema.parse(
        await call(action, controller.signal),
      );
      if (controller.signal.aborted) return false;
      revision.current++;
      setStored({ scope, state: result });
      if (action.action === "finish") {
        startId.current = null;
        setOpen(false);
        toast({
          title: "Interview finished",
          description: state?.session?.questions.some((question) => question.state === "answered")
            ? "Edit your responses anytime in Edit profile → Lore → Questions."
            : "You can start another interview when you’re ready.",
        });
      }
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
        setOpening(false);
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
    legacy[0] ?? (session?.interviewInvalidated ? undefined : session?.questions.find((q) => q.state === "offered"));
  const readyToStart = session?.state === "active" && session.questions.length === 0 && preparationStatus === "ready";
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
    if (unsavedResponses.current.size) {
      setView("responses");
      toast({ title: "Your edit is still open", description: "Save or cancel your response edit before closing." });
      return;
    }
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
  const triggerLabel = loading ? "Loading interview…" : offered ? (legacy.length ? "Review saved question" : "Resume interview") : queued ? "Preparing interview…" : preparationStatus === "ready" ? "Start interview" : "Interview";
  const start = () => {
    startId.current ??= crypto.randomUUID();
    void mutate({ action: "start", requestId: startId.current });
  };
  return (
    <Dialog open={open && (!!state || !!error)} onOpenChange={(next) => { if (!next) close(); }}>
      <DialogTrigger asChild>
        <button type="button"
          aria-label={triggerLabel}
          title={triggerLabel}
          className="profile-reveal-action button-glass inline-flex min-h-11 items-center gap-2 rounded-lg border border-black/15 bg-black/[0.03] px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-black/5 dark:border-white/20 dark:bg-white/10 dark:hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pastypink disabled:opacity-40"
          disabled={loading || busy || (queued && !offered)}
          onClick={() => {
            setOpen(true);
            if (session && (session.needsPreparedBankResume || (!offered && preparationStatus === "ready")))
              void mutate({ action: "continue", sessionId: session.id });
          }}>
          <MessageCircleQuestion size={18} aria-hidden="true" />
          <span className="profile-reveal-label">{triggerLabel}</span>
        </button>
      </DialogTrigger>
        <DialogContent aria-busy={busy || queued}
          onEscapeKeyDown={(event) => { if (pending.current) event.preventDefault(); }}
          onPointerDownOutside={(event) => { if (pending.current) event.preventDefault(); }}
          className={`${dialogStyles.dialog} mn-themed-dialog artist-link-panel max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-xl overflow-hidden rounded-2xl border-white/15 bg-neutral-950/80 bg-gradient-to-br from-white/[0.08] via-transparent to-white/[0.02] p-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl backdrop-saturate-150 dark:bg-neutral-950/80 sm:rounded-2xl sm:p-6`}>
          <DialogHeader className="shrink-0 space-y-1.5 pr-7 text-left">
            <DialogTitle className="text-xl font-semibold leading-snug tracking-tight">{view === "preferences" ? "Topic preferences" : view === "responses" ? "Your responses" : "A few questions"}</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-muted-foreground dark:text-white/60">
              {view === "preferences" ? "Choose what to explore or leave out. You can change these preferences anytime." : view === "responses" ? "Edit your responses anytime in Edit profile → Lore → Questions." : "Tell your story in your own words. Answer at your pace, and skip anything you’d rather not discuss."}
            </DialogDescription>
          </DialogHeader>
          <div role="region" aria-label="Interview responses and controls" className={`${dialogStyles.body} pt-3 pb-6 px-1`}>
      <div hidden={view !== "interview"}>
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
      {answers.failure && <div role="alert" className="my-4 space-y-3 rounded-xl border border-amber-600/40 p-3 text-sm">
        <p>{answers.failure}</p>
        <button type="button" onClick={answers.retry} className="min-h-11 rounded-xl border border-input px-4 py-2.5 font-medium focus-visible:ring-2 focus-visible:ring-pastypink">Retry saving</button>
      </div>}
      {(busy || (queued && !offered)) && (
        <div role="status" aria-live="polite" className="my-6 flex items-center gap-3 rounded-xl bg-black/[0.03] p-4 text-sm dark:bg-white/5">
          <LoaderCircle aria-hidden="true" className="h-5 w-5 shrink-0 animate-spin text-pastypink motion-reduce:animate-none" />
          <div>
            <p>{queued || preparing ? (state?.preparation?.phase === "checking" ? "Checking your next question…" : "Preparing your questions…") : opening ? "Opening your question…" : "Saving your interview…"}</p>
            {(queued || preparing) && state?.preparation?.phase !== "checking" && <p className="mt-1 text-xs text-muted-foreground">You can close this window. We’ll keep preparing it in the background.</p>}
          </div>
        </div>
      )}
      {preparationStatus === "failed" && !busy && (
        <p role="alert" className="my-4 text-sm text-muted-foreground">We couldn’t finish preparing your interview. Your saved responses are safe.</p>
      )}
      {!loading && !busy && (!queued || !!offered) && state && (
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
                const saved = answers.enqueue({
                  action: "answer",
                  answerId: offered.id,
                  expectedRevision: offered.revision,
                  answer,
                });
                if (saved) revision.current++;
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
                {session.interviewInvalidated
                  ? "Your topic preferences changed. Finish this session to prepare new questions. Session-only preferences end when you finish."
                  : session.questions.length >= 3
                  ? "That’s three questions. Thanks for sharing your story."
                  : preparationStatus === "ready" && state.preparation?.readyCount
                    ? `${state.preparation.readyCount} ${state.preparation.readyCount === 1 ? "question" : "questions"} ready. Answer at your own pace.`
                    : session.questions.length === 0
                    ? "Your interview is open."
                    : "Your response is saved."}
              </p>
              {session.questions.length < 3 && !session.interviewInvalidated && !readyToStart && (
                <button
                  type="button"
                  className={button}
                  disabled={busy}
                  onClick={() =>
                    void mutate({ action: preparationStatus === "ready" ? "continue" : "prepare", sessionId: session.id })
                  }
                >
                  {preparationStatus === "ready" ? (session.questions.length ? "Next question" : "Start interview") : preparationStatus === "failed" || preparationStatus === "stale" ? "Try again" : "Prepare next question"}
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
              Prepare interview
            </button>
          )}
          {session?.state === "active" && session.questions.length > 0 && !offered && (
            <div>
              <button
                type="button"
                className="min-h-11 rounded-xl border border-input bg-black/[0.03] px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-black/5 dark:border-white/20 dark:bg-white/5 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pastypink disabled:opacity-40"
                disabled={busy || answers.entries.length > 0}
                onClick={() =>
                  void mutate({ action: "finish", sessionId: session.id })
                }
              >
                Finish interview
              </button>

            </div>
          )}
          <div className={readyToStart ? "flex flex-wrap items-center gap-3 pt-2" : "mt-6 flex flex-wrap items-center gap-2 border-t border-black/10 pt-5 dark:border-white/10"}>
          {readyToStart && (
            <button type="button" className={button} disabled={busy}
              onClick={() => void mutate({ action: "continue", sessionId: session.id })}>
              Start interview
            </button>
          )}
          {(session || origin) && <button type="button" className={dialogStyles.utilityButton}
            disabled={busy || answers.entries.length > 0} onClick={() => setView("preferences")}>
            <SlidersHorizontal size={14} aria-hidden="true" /> Topic preferences
          </button>}
          {!!session?.questions.some((q) => q.state !== "offered") && (
            <button type="button" className={dialogStyles.utilityButton} disabled={busy || answers.entries.length > 0} onClick={() => setView("responses")}>
              <MessageSquare size={14} aria-hidden="true" />
              Your responses <span className="text-muted-foreground">· {session.questions.filter(q => q.state !== "offered").length}</span>
            </button>
          )}
          </div>
        </div>
      )}
          <div className="mt-4">
            {error && <button type="button" disabled={busy || loading} onClick={() => void reload()} className="min-h-11 rounded-xl border border-input bg-black/[0.03] px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-black/5 dark:border-white/20 dark:bg-white/5 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pastypink disabled:opacity-40">Reload saved interview</button>}
          </div>
          </div>
          <section hidden={view !== "responses"} aria-label="Saved interview responses">
            <button type="button" className={dialogStyles.utilityButton} onClick={() => setView("interview")}>
              <ArrowLeft size={16} aria-hidden="true" /> Back to interview
            </button>
            <ol className="mt-5 divide-y divide-black/10 dark:divide-white/10">
              {session?.questions.filter(q => q.state !== "offered").map((q, index) => (
                <li key={q.id} className="py-5 first:pt-0 last:pb-0">
                  <p className="mb-2 text-xs text-muted-foreground">Question {index + 1}</p>
                  <h3 className="text-sm font-semibold leading-relaxed">{q.question}</h3>
                  <div className="mt-3">
                    {answers.entries.some(entry => entry.answerId === q.id) ? <p className="text-sm text-muted-foreground">Waiting for save confirmation.</p> : q.answer !== null ? <InterviewResponseCard artistId={artistId} response={{ ...q, answer: q.answer }} inline onUnsavedChange={trackUnsavedResponse}
                      onSaved={(saved) => {
                        revision.current++;
                        setStored(previous => previous?.scope === scope && previous.state.session ? {
                          ...previous,
                          state: { ...previous.state, session: { ...previous.state.session,
                            questions: previous.state.session.questions.map(question => question.id === saved.id ? {
                              ...question, answer: saved.answer, revision: saved.revision,
                              answerUpdatedAt: saved.answerUpdatedAt ?? question.answerUpdatedAt,
                            } : question),
                          } },
                        } : previous);
                      }} /> : <p className="text-sm text-muted-foreground">Skipped</p>}
                  </div>
                </li>
              ))}
            </ol>
          </section>
          {(session || origin) && (
            <ApiInterviewBoundaries
              key={`${scope}:${session?.id ?? "legacy"}`}
              open={view === "preferences"}
              onBack={() => setView("interview")}
              questionKey={origin?.questionKey ?? null}
              busy={busy || answers.entries.length > 0}
              call={async (body) => {
                const result = await call(body, life.current?.signal);
                if ((body.action === "boundary" || body.action === "retract") && life.current) await restore(life.current.signal);
                return result;
              }}
            />
          )}
          </div>
        </DialogContent>
    </Dialog>
  );
}
