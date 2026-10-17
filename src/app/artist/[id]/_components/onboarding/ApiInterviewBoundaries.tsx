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
    "min-h-11 rounded-lg px-3 py-2 text-xs text-gray-500 transition-colors hover:bg-black/5 dark:text-gray-400 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pastypink disabled:opacity-40";
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
          <p className="text-sm text-gray-500 dark:text-gray-400">
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
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
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
                placeholder={'For example: “Keep the focus on my music, not my personal life.” Or “Ask me about how I made my latest release.”'}
                value={wording}
                maxLength={4000}
                disabled={busy || pending}
                onChange={(e) => setWording(e.target.value)}
                className="w-full resize-y rounded-xl border border-input bg-black/[0.02] p-3 text-base sm:text-sm leading-relaxed text-foreground placeholder:italic placeholder:text-gray-500 dark:placeholder:text-gray-400 dark:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pastypink/60 disabled:opacity-50"
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
                className="min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pastypink"
              >
                <option value="sitting">For this sitting</option>
                <option value="until_retracted">Until I remove it</option>
              </select>
              <button
                type="button"
                className="min-h-11 rounded-xl button-pink bg-highlightpink px-4 py-2.5 text-sm font-semibold text-[#111] transition-colors hover:bg-highlightpink/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pastypink disabled:opacity-40"
                disabled={
                  busy || pending || !wording.trim() || entries === null
                }
                onClick={() => void save()}
              >
                Save topic instruction
              </button>
            </>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Existing instructions still apply. You can add a new instruction
              once a question is available.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
