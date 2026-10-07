"use client";
import { useRef, useState } from "react";
import { z } from "zod";
import type { InterviewRequest } from "@/lib/interviewApi/interviewRequestSchema";
const memorySchema = z.object({
  constraintsComplete: z.literal(true),
  entries: z.array(
    z.object({
      entryId: z.string(),
      kind: z.enum(["latest_answer", "correction", "boundary"]),
      metadata: z.record(z.union([z.string(), z.number(), z.null()])),
      fields: z.array(
        z.object({
          name: z.string(),
          text: z.string().nullable(),
          complete: z.literal(true),
        }),
      ),
    }),
  ),
});
/** Only explicit artist words become topic instructions; a skip has no implicit lifetime. */
export default function ApiInterviewBoundaries({
  questionKey,
  busy,
  call,
}: {
  questionKey: string;
  busy: boolean;
  call: (body: InterviewRequest) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false),
    [wording, setWording] = useState(""),
    [scope, setScope] = useState<"sitting" | "until_retracted">("sitting"),
    [pending, setPending] = useState(false),
    [error, setError] = useState<string | null>(null),
    [entries, setEntries] = useState<
      z.infer<typeof memorySchema>["entries"] | null
    >(null);
  const savedRequest = useRef<{ key: string; requestId: string } | null>(null);
  const load = async () => {
    const result = memorySchema.parse(await call({ action: "memory" }));
    setEntries(result.entries.filter((e) => e.kind === "boundary"));
  };
  const toggle = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    setPending(true);
    setError(null);
    try {
      await load();
    } catch {
      setError(
        "Topic instructions could not be restored. Try opening this panel again.",
      );
    } finally {
      setPending(false);
    }
  };
  const save = async () => {
    if (pending || busy || !wording.trim()) return;
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
      setWording("");
      savedRequest.current = null;
      await load();
    } catch {
      setError(
        "The instruction could not be confirmed. Your words are kept here; retry or reload the interview.",
      );
    } finally {
      setPending(false);
    }
  };
  const retract = async (entry: NonNullable<typeof entries>[number]) => {
    const revision = entry.metadata.boundaryRevision;
    if (typeof revision !== "string") return;
    setPending(true);
    setError(null);
    try {
      await call({
        action: "retract",
        boundaryId: entry.entryId.replace(/^boundary:/, ""),
        revision,
      });
      await load();
    } catch {
      setError(
        "The instruction changed or could not be removed. Reopen this panel.",
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
            <p role="alert" className="text-sm">
              {error}
            </p>
          )}
          {entries?.length === 0 && (
            <p className="text-sm">No active topic instructions.</p>
          )}
          {entries?.map((entry) => (
            <div
              key={entry.entryId}
              className="rounded-lg border border-black/10 p-3 dark:border-white/15"
            >
              <p className="whitespace-pre-wrap break-words text-sm">
                {entry.fields.find((f) => f.name === "wording")?.text}
              </p>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                {entry.metadata.scope === "sitting"
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
            disabled={busy || pending || !wording.trim() || entries === null}
            onClick={() => void save()}
          >
            Save topic instruction
          </button>
        </div>
      )}
    </div>
  );
}
