"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { interviewRequestSchema, type InterviewRequest } from "@/lib/interviewApi/interviewRequestSchema";
import { interviewSessionStateSchema, type InterviewSessionState } from "@/lib/interviewApi/sessionSchemas";
type Answer = Extract<InterviewRequest, { action: "answer" }>;
const queueSchema = z.array(interviewRequestSchema).max(20).refine((items) => items.every((item) => item.action === "answer")).transform((items) => items as Answer[]);
/** Persist exact answer intents before advancing, then confirm them in order. */
export function useInterviewAnswerQueue(scope: string, call: (body: InterviewRequest, signal?: AbortSignal) => Promise<unknown>, confirmed: (state: InterviewSessionState) => void) {
  const key = `mn-interview-outbox:${scope}`;
  const current = useRef<{ key: string; entries: Answer[] }>({ key: "", entries: [] });
  const [saved, setSaved] = useState(current.current);
  const [failure, setFailure] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const entries = saved.key === key ? saved.entries : [];
  const persist = useCallback((next: Answer[]) => {
    localStorage.setItem(key, JSON.stringify(next));
    current.current = { key, entries: next };
    setSaved(current.current);
  }, [key]);
  useEffect(() => {
    try {
      current.current = { key, entries: queueSchema.parse(JSON.parse(localStorage.getItem(key) ?? "[]")) };
      setSaved(current.current);
      setFailure(null);
    } catch {
      setFailure("Your saved responses could not be restored from this browser. Keep this window open.");
    }
  }, [key]);
  const head = entries[0];
  useEffect(() => {
    if (!head || failure) return;
    const controller = new AbortController();
    void call(head, controller.signal).then((result) => {
      if (controller.signal.aborted || current.current.key !== key) return;
      const state = interviewSessionStateSchema.parse(result);
      const acknowledgement = state.savedQuestion ?? [...(state.session?.questions ?? []), ...state.legacyOffers].find((question) => question.id === head.answerId);
      if (!acknowledgement || acknowledgement.id !== head.answerId || acknowledgement.answer !== head.answer || acknowledgement.state !== (head.answer === null ? "skipped" : "answered")) throw new Error("Answer was not confirmed");
      // Apply authoritative state before removing its optimistic answer.
      confirmed(state);
      persist(current.current.entries.filter((entry) => entry.answerId !== head.answerId));
    }).catch(() => {
      if (!controller.signal.aborted) setFailure("A response hasn’t saved yet. It’s kept on this device. Retry before finishing.");
    });
    return () => controller.abort();
  }, [head, key, call, confirmed, persist, failure, attempt]);
  const enqueue = (answer: Answer) => {
    if (current.current.key !== key) return false;
    if (current.current.entries.some((entry) => entry.answerId === answer.answerId)) return false;
    try {
      persist([...current.current.entries, answer]);
      return true;
    } catch {
      setFailure("Your response could not be kept on this device. Keep this window open and try again.");
      return false;
    }
  };
  return { entries, enqueue, failure, ready: saved.key === key, retry: () => { setFailure(null); setAttempt((value) => value + 1); } };
}
