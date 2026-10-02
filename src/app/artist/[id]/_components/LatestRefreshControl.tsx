"use client";
import { useContext, useEffect, useRef, useState } from "react";
import { EditModeContext } from "@/app/_components/EditModeContext";
import { useRouter } from "next/navigation";
import { RefreshCw, Loader2, Check, AlertCircle } from "lucide-react";
import { musicNerdApiUrl } from "@/lib/musicNerdApi/musicNerdApiUrl";
import {
  LATEST_SOURCES,
  LATEST_SOURCE_LABELS,
  type LatestRefreshView,
} from "@/lib/latest/types";

export default function LatestRefreshControl({
  artistId,
}: {
  artistId: string;
}) {
  const { canEdit, isEditing } = useContext(EditModeContext);
  return canEdit && isEditing ? <LatestRefreshStatus artistId={artistId} /> : null;
}

function LatestRefreshStatus({ artistId }: { artistId: string }) {
  const router = useRouter();
  const [refresh, setRefresh] = useState<LatestRefreshView | null>(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
  const pending =
    refresh?.status === "pending" || refresh?.status === "running";
  const locked = useRef(false);
  const requestVersion = useRef(0);
  const endpoint = `/api/artist/${artistId}/latest-refresh`;
  useEffect(() => {
    let active = true;
    const version = requestVersion.current;
    fetch(endpoint, { cache: "no-store" })
      .then(async (r) => {
        if (r.ok && active) {
          const data = await r.json();
          if (active && version === requestVersion.current) setRefresh(data.refresh);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [endpoint]);
  useEffect(() => {
    if (!refresh) return;
    const timer = setInterval(() => setClock(Date.now()), 30000);
    return () => clearInterval(timer);
  }, [refresh]);
  useEffect(() => {
    if (!pending) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    async function tick() {
      try {
        // MusicNerdAPI runs the Instagram check (#1365); the status is read here.
        // Only Latest jobs: otherwise this waits behind an older research job.
        const response = await fetch(musicNerdApiUrl("/api/research/advance"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ artistId, kinds: ["latest_refresh"] }),
          signal: controller.signal,
        });
        if (!response.ok)
          throw Error("Update paused. Reload to check its progress.");
        const status = await fetch(endpoint, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!status.ok)
          throw Error("Could not check progress. Reload to try again.");
        const data = await status.json();
        if (active) {
          setRefresh(data.refresh);
          setError("");
          router.refresh();
        }
      } catch (e) {
        if (active)
          setError(
            e instanceof Error ? e.message : "Could not check progress.",
          );
      }
      if (active) timer = setTimeout(tick, 10000);
    }
    void tick();
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [pending, endpoint, artistId, router]);
  async function start() {
    if (locked.current) return;
    locked.current = true;
    requestVersion.current += 1;
    setStarting(true);
    setError("");
    setExpanded(true);
    try {
      const response = await fetch(endpoint, { method: "POST" });
      const data = await response.json();
      if (!response.ok)
        throw Error(data.error || "Could not start this update.");
      setRefresh(data.refresh);
      setClock(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start this update.");
    } finally {
      locked.current = false;
      setStarting(false);
    }
  }
  const cooldown =
    refresh && !pending
      ? Math.max(0, Math.ceil((Date.parse(refresh.retryAt) - clock) / 60000))
      : 0;
  const failed =
    refresh &&
    LATEST_SOURCES.some((s) => refresh.sources[s]?.status === "failed");
  const summary = pending
    ? "Checking your connected sources…"
    : refresh
      ? failed
        ? "Some sources couldn’t update."
        : "Latest checked."
      : "Check your connected sources for new updates.";
  return (
    <div className="w-full space-y-2 text-foreground sm:w-auto sm:max-w-sm">
      <div className="flex flex-wrap items-center gap-3 sm:justify-end">
        <button
          type="button"
          onClick={start}
          disabled={starting || pending || cooldown > 0}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-pastypink/40 bg-pastypink/10 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-pastypink/20 disabled:cursor-default disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pastypink"
        >
          {starting || pending ? (
            <Loader2
              size={15}
              className="animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          ) : (
            <RefreshCw size={15} aria-hidden="true" />
          )}
          {starting || pending ? "Updating Latest…" : "Update Latest"}
        </button>
        {refresh && (
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
            className="min-h-11 text-sm text-muted-foreground underline underline-offset-4"
          >
            {expanded ? "Hide details" : "View details"}
          </button>
        )}
      </div>
      <p
        role="status"
        className="text-xs leading-relaxed text-muted-foreground sm:text-right"
      >
        {summary}
        {cooldown > 0 && ` Check again in ${cooldown} min.`}
      </p>
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-300">
          {error}
        </p>
      )}
      {expanded && refresh && (
        <ul
          className="space-y-2 rounded-2xl border border-border bg-background/70 p-3 text-xs"
          aria-label="Source update results"
        >
          {LATEST_SOURCES.map((source) => {
            const result = refresh.sources[source];
            const status = result?.status;
            const Icon =
              status === "checked"
                ? Check
                : status === "failed"
                  ? AlertCircle
                  : status === "pending"
                    ? Loader2
                    : RefreshCw;
            const label =
              status === "checked"
                ? "Checked"
                : status === "failed"
                  ? "Couldn’t check"
                  : status === "pending"
                    ? "Checking…"
                    : "Not connected";
            return (
              <li
                key={source}
                className="flex items-center justify-between gap-4"
              >
                <span>{LATEST_SOURCE_LABELS[source]}</span>
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <Icon size={12} aria-hidden="true" />
                  {label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
