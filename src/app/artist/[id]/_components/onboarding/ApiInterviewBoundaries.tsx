"use client";
import { useRef, useState } from "react";
import { z } from "zod";
import type { InterviewRequest } from "@/lib/interviewApi/interviewRequestSchema";
const boundaryPageSchema = z.object({
  status: z.literal("ok"),
  sitting: z.number().int().positive(),
  boundaries: z
    .array(
      z.object({
        id: z.string().uuid(),
        revision: z.string().regex(/^[a-f0-9]{64}$/),
        wording: z.string().min(1).max(4000),
        scope: z.enum(["sitting", "until_retracted"]),
      }),
    )
    .max(5),
  nextCursor: z.string().min(1).max(4096).nullable(),
});
/** Only explicit artist words become topic instructions; a skip has no implicit lifetime. */
export default function ApiInterviewBoundaries({
  questionKey,
  busy,
  call,
}: {
  questionKey: string | null;
  busy: boolean;
  call: (body: InterviewRequest) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false),
    [wording, setWording] = useState(""),
    [scope, setScope] = useState<"sitting" | "until_retracted">("sitting"),
    [pending, setPending] = useState(false),
    [error, setError] = useState<string | null>(null),
    [nextCursor, setNextCursor] = useState<string | null>(null),
    [entries, setEntries] = useState<
      z.infer<typeof boundaryPageSchema>["boundaries"] | null
    >(null);
  const savedRequest = useRef<{ key: string; requestId: string } | null>(null);
  const clearList = () => {
    setEntries(null);
    setNextCursor(null);
  };
  const load = async (cursor?: string) => {
    const result = boundaryPageSchema.parse(
      await call({ action: "boundaries", ...(cursor ? { cursor } : {}) }),
    );
    if (cursor && result.nextCursor === cursor)
      throw new Error("Instruction continuation did not advance");
    setEntries((previous) =>
      cursor ? [...(previous ?? []), ...result.boundaries] : result.boundaries,
    );
    setNextCursor(result.nextCursor);
  };
  const restore = async (cursor?: string) => {
    setPending(true);
    setError(null);
    try {
      await load(cursor);
    } catch {
      clearList();
      setError(
        "Topic instructions changed or could not be restored. Reload the instructions to continue.",
      );
    } finally {
      setPending(false);
    }
  };
  const toggle = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    await restore();
  };
  const save = async () => {
    if (pending || busy || !wording.trim() || !questionKey) return;
    setPending(true);
    setError(null);
    const key = JSON.stringify({ wording, scope, questionKey });
    if (savedRequest.current?.key !== key)
      savedRequest.current = { key, requestId: crypto.randomUUID() };
    try {
      await call({
        action: "boundary",
        requestId: savedRequest.current.requestId,
        questionKey,
        wording,
        scope,
      });
      await load();
      setWording("");
      savedRequest.current = null;
    } catch {
      clearList();
      setError(
        "The instruction could not be confirmed. Your words are kept here; reload the instructions before retrying.",
      );
    } finally {
      setPending(false);
    }
  };
  const retract = async (entry: NonNullable<typeof entries>[number]) => {
    setPending(true);
    setError(null);
    try {
      await call({
        action: "retract",
        boundaryId: entry.id,
        revision: entry.revision,
      });
      await load();
    } catch {
      clearList();
      setError(
        "The instruction changed or could not be removed. Reload the instructions to continue.",
      );
    } finally {
      setPending(false);
    }
  };
  const button =
    "min-h-11 rounded-lg border border-black/15 px-3 py-2 text-sm disabled:opacity-50 dark:border-white/20";
  return (
    <div className="border-t border-black/10 pt-3 dark:border-white/15">
      <button
        type="button"
        className={button}
        disabled={busy || pending}
        aria-expanded={open}
        onClick={() => void toggle()}
      >
        Topic preferences
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            Tell the interviewer what to leave out or how to approach a topic.
            Your exact words stay active for the scope you choose.
          </p>
          {pending && (
            <p role="status" className="text-sm">
              Updating topic preferences…
            </p>
          )}
          {error && (
            <div className="space-y-2">
              <p role="alert" className="text-sm">
                {error}
              </p>
              <button
                type="button"
                className={button}
                disabled={busy || pending}
                onClick={() => void restore()}
              >
                Reload instructions
              </button>
            </div>
          )}
          {entries?.length === 0 && (
            <p className="text-sm">No active topic instructions.</p>
          )}
          {entries?.map((entry) => (
            <div
              key={entry.id}
              className="rounded-lg border border-black/10 p-3 dark:border-white/15"
            >
              <p className="whitespace-pre-wrap break-words text-sm">
                {entry.wording}
              </p>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                {entry.scope === "sitting"
                  ? "This sitting only"
                  : "Until you remove it"}
              </p>
              <button
                type="button"
                className={`${button} mt-2`}
                disabled={busy || pending}
                onClick={() => void retract(entry)}
              >
                Remove instruction
              </button>
            </div>
          ))}
          {nextCursor && (
            <button
              type="button"
              className={button}
              disabled={busy || pending}
              onClick={() => void restore(nextCursor)}
            >
              Show more instructions
            </button>
          )}
          {questionKey ? (
            <>
              <label className="block text-sm" htmlFor={`topic-${questionKey}`}>
                Your topic instruction
              </label>
              <textarea
                id={`topic-${questionKey}`}
                rows={3}
                value={wording}
                maxLength={4000}
                disabled={busy || pending}
                onChange={(e) => setWording(e.target.value)}
                className="w-full rounded-lg border border-black/20 bg-transparent p-3 text-sm dark:border-white/25"
              />
              <label className="block text-sm" htmlFor={`scope-${questionKey}`}>
                Keep this instruction
              </label>
              <select
                id={`scope-${questionKey}`}
                value={scope}
                disabled={busy || pending}
                onChange={(e) =>
                  setScope(e.target.value as "sitting" | "until_retracted")
                }
                className="min-h-11 w-full rounded-lg border border-black/20 bg-white px-3 text-sm dark:border-white/25 dark:bg-neutral-900"
              >
                <option value="sitting">For this sitting</option>
                <option value="until_retracted">Until I remove it</option>
              </select>
              <button
                type="button"
                className={button}
                disabled={
                  busy || pending || !wording.trim() || entries === null
                }
                onClick={() => void save()}
              >
                Save topic instruction
              </button>
            </>
          ) : (
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              Existing instructions still apply. You can add a new instruction
              once a question is available.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
