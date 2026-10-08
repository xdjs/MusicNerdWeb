"use client";

import {
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditModeContext } from "@/app/_components/EditModeContext";
import { requestInterviewResponses } from "@/lib/interviewResponses/requestInterviewResponses";
import {
  responseReadSchema,
  responseVersionsSchema,
  type InterviewResponse,
  type ResponseVersion,
} from "@/lib/interviewResponses/types";

/** Exact saved words, with explicit edits and version history; drafts stay mounted across tabs. */
export default function InterviewResponseCard({
  artistId,
  response,
}: {
  artistId: string;
  response: InterviewResponse;
}) {
  const { registerSave } = useContext(EditModeContext);
  const id = useId();
  const [current, setCurrent] = useState(response);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(response.answer);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const alive = useRef(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [latest, setLatest] = useState<InterviewResponse | null>(null);
  const [versions, setVersions] = useState<ResponseVersion[] | null>(null);
  const [versionCursor, setVersionCursor] = useState<string | null>(null);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const dirty = editing && draft !== current.answer;
  const valid =
    Boolean(draft.trim()) && draft.length <= 2000 && note.length <= 400;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const save = useCallback(async () => {
    if (!dirty) return;
    if (!valid)
      throw new Error("Keep the response between 1 and 2,000 characters.");
    if (saving.current) throw new Error("Your response is still saving.");
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await requestInterviewResponses(
        artistId,
        `/${current.id}`,
        responseReadSchema,
        { body: { expectedRevision: current.revision, answer: draft, note } },
      );
      if (!alive.current) return;
      setCurrent(result.response);
      setDraft(result.response.answer);
      setNote("");
      setEditing(false);
      setSaved(true);
      setLatest(null);
      setVersions(null);
      setVersionCursor(null);
    } catch (e) {
      if (alive.current)
        setError(
          e instanceof Error ? e.message : "Could not save your response.",
        );
      throw e;
    } finally {
      saving.current = false;
      if (alive.current) setBusy(false);
    }
  }, [dirty, valid, artistId, current.id, current.revision, draft, note]);
  useEffect(
    () => registerSave?.(`interview-response-${current.id}`, save),
    [registerSave, current.id, save],
  ); // Re-register the current exact draft for profile Done.
  async function readLatest() {
    setBusy(true);
    setError("");
    try {
      const result = await requestInterviewResponses(
        artistId,
        `/${current.id}`,
        responseReadSchema,
      );
      if (alive.current) setLatest(result.response);
    } catch (e) {
      if (alive.current)
        setError(
          e instanceof Error
            ? e.message
            : "Could not load the latest response.",
        );
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  async function history(cursor?: string) {
    setHistoryBusy(true);
    setHistoryError("");
    try {
      const result = await requestInterviewResponses(
        artistId,
        `/${current.id}/versions?limit=5${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
        responseVersionsSchema,
      );
      if (alive.current) {
        setVersions((previous) =>
          cursor ? [...(previous ?? []), ...result.versions] : result.versions,
        );
        setVersionCursor(result.nextCursor);
      }
    } catch (e) {
      if (alive.current)
        setHistoryError(
          e instanceof Error ? e.message : "Could not load earlier versions.",
        );
    } finally {
      if (alive.current) setHistoryBusy(false);
    }
  }
  return (
    <details className="group rounded-xl border border-black/10 text-foreground dark:border-white/15">
      <summary className="flex min-h-14 cursor-pointer list-none items-start justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <h4 className="break-words text-sm font-semibold">
            {current.question}
          </h4>
          <p className="mt-1 text-xs text-muted-foreground">
            {current.sitting ? `Interview ${current.sitting}` : "Interview"}
            {current.offeredAt
              ? ` · ${new Date(current.offeredAt).toLocaleDateString()}`
              : ""}
          </p>
        </div>
        <ChevronDown
          size={18}
          aria-hidden="true"
          className="mt-0.5 shrink-0 group-open:rotate-180"
        />
      </summary>
      <div className="space-y-4 border-t border-black/10 p-4 dark:border-white/10">
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Your saved response
          </p>
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {current.answer}
          </p>
        </div>
        {saved && (
          <p
            role="status"
            className="text-sm text-emerald-700 dark:text-emerald-300"
          >
            Response saved. Lore is updating with your revised wording.
          </p>
        )}
        {editing ? (
          <div className="space-y-3">
            <label
              htmlFor={`${id}-answer`}
              className="block text-sm font-medium"
            >
              Your response
            </label>
            <textarea
              id={`${id}-answer`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={busy}
              rows={6}
              maxLength={2000}
              className="w-full rounded-lg border border-black/20 bg-transparent p-3 text-sm text-foreground dark:border-white/25"
            />
            <p className="text-xs text-muted-foreground">
              {draft.length.toLocaleString()} / 2,000 characters. Keep any
              details about which song, version, or time you mean.
            </p>
            <label htmlFor={`${id}-note`} className="block text-sm">
              What changed?{" "}
              <span className="text-muted-foreground">(optional)</span>
            </label>
            <input
              id={`${id}-note`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={busy}
              maxLength={400}
              className="w-full rounded-lg border border-black/20 bg-transparent p-3 text-sm text-foreground dark:border-white/25"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="pink"
                disabled={busy || !dirty || !valid}
                onClick={() => {
                  void save().catch(() => {});
                }}
              >
                {busy ? "Saving…" : "Save response"}
              </Button>
              <Button
                type="button"
                variant="glass"
                disabled={busy}
                onClick={() => {
                  setEditing(false);
                  setDraft(current.answer);
                  setNote("");
                  setError("");
                  setLatest(null);
                }}
              >
                Cancel
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This becomes your current response. Earlier wording stays in
              version history; saved bios stay as they are.
            </p>
          </div>
        ) : (
          <Button
            type="button"
            variant="glass"
            onClick={() => {
              setEditing(true);
              setSaved(false);
            }}
          >
            Edit response
          </Button>
        )}
        {error && (
          <div className="space-y-2">
            <p role="alert" className="text-sm text-red-700 dark:text-red-300">
              {error}
            </p>
            <Button
              type="button"
              variant="glass"
              disabled={busy}
              onClick={() => void readLatest()}
            >
              Read latest saved response
            </Button>
          </div>
        )}
        {latest && (
          <div className="space-y-2 rounded-lg border border-black/15 p-3 dark:border-white/20">
            <p className="text-sm font-semibold">Latest saved wording</p>
            <p className="whitespace-pre-wrap break-words text-sm">
              {latest.answer}
            </p>
            <p className="text-xs text-muted-foreground">
              Your draft is still above. Compare it before saving a new version.
            </p>
            <Button
              type="button"
              variant="glass"
              onClick={() => {
                setCurrent(latest);
                setLatest(null);
                setError("");
              }}
            >
              I’ve reviewed it — keep my draft
            </Button>
          </div>
        )}
        <div className="border-t border-black/10 pt-3 dark:border-white/10">
          <Button
            type="button"
            variant="glass"
            disabled={historyBusy}
            onClick={() => (versions ? setVersions(null) : void history())}
          >
            {versions
              ? "Hide version history"
              : historyBusy
                ? "Loading versions…"
                : "Version history"}
          </Button>
          {historyError && (
            <p
              role="alert"
              className="mt-2 text-sm text-red-700 dark:text-red-300"
            >
              {historyError}
            </p>
          )}
          {versions && (
            <div className="mt-3 space-y-4">
              {versions.map((v) => (
                <div
                  key={v.response.revision}
                  className="border-l-2 border-pink-500/40 pl-3"
                >
                  <p className="text-xs text-muted-foreground">
                    {v.isCurrent ? "Current version" : "Earlier version"}
                    {v.savedAt
                      ? ` · ${new Date(v.savedAt).toLocaleString()}`
                      : ""}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm">
                    {v.response.answer}
                  </p>
                  {v.note && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Edit note: {v.note}
                    </p>
                  )}
                </div>
              ))}
              {versionCursor && (
                <Button
                  type="button"
                  variant="glass"
                  disabled={historyBusy}
                  onClick={() => void history(versionCursor)}
                >
                  Earlier versions
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                Version history starts with the first edit made here.
              </p>
            </div>
          )}
        </div>
      </div>
    </details>
  );
}
