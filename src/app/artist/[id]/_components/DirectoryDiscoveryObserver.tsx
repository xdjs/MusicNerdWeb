"use client";
import { useContext, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { EditModeContext } from "@/app/_components/EditModeContext";
import { requestDirectoryDiscovery } from "@/lib/artist/requestDirectoryDiscovery";

/** Observe saved destinations only. Durable workers run independently of this page. */
export default function DirectoryDiscoveryObserver({
  artistId,
  initialRevision,
}: {
  artistId: string;
  initialRevision: string;
}) {
  const router = useRouter();
  const { isEditing } = useContext(EditModeContext);
  const startedAt = useRef(Date.now());
  const revision = useRef(initialRevision);
  const finished = useRef(false);
  useEffect(() => {
    if (isEditing || finished.current) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let request: AbortController | undefined;
    let failures = 0;
    const expired = () => Date.now() - startedAt.current >= 10 * 60_000;
    const schedule = () => {
      if (
        !cancelled &&
        !finished.current &&
        !expired() &&
        document.visibilityState === "visible"
      )
        timer = setTimeout(poll, 5000);
    };
    async function poll() {
      if (
        cancelled ||
        finished.current ||
        expired() ||
        document.visibilityState !== "visible" ||
        request
      )
        return;
      const controller = new AbortController();
      request = controller;
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await requestDirectoryDiscovery(
          artistId,
          controller.signal,
        );
        if (cancelled || controller.signal.aborted) return;
        if (!response || [401, 403, 404].includes(response.status)) {
          finished.current = true;
          return;
        }
        if (!response.ok) throw new Error("Discovery unavailable");
        const data: unknown = await response.json();
        if (
          cancelled ||
          controller.signal.aborted ||
          document.visibilityState !== "visible"
        )
          return;
        if (
          !data ||
          typeof data !== "object" ||
          !("revision" in data) ||
          typeof data.revision !== "string" ||
          !("state" in data) ||
          !["active", "complete", "failed", "stopped"].includes(
            String(data.state),
          )
        )
          throw new Error("Invalid discovery status");
        failures = 0;
        if (data.revision !== revision.current || data.state === "complete") {
          revision.current = data.revision;
          router.refresh();
        }
        if (data.state !== "active") finished.current = true;
      } catch {
        if (
          !cancelled &&
          document.visibilityState === "visible" &&
          ++failures >= 3
        )
          finished.current = true;
      } finally {
        clearTimeout(timeout);
        request = undefined;
        schedule();
      }
    }
    function visibilityChanged() {
      clearTimeout(timer);
      if (document.visibilityState !== "visible") request?.abort();
      else if (!request) void poll();
    }
    document.addEventListener("visibilitychange", visibilityChanged);
    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      request?.abort();
      document.removeEventListener("visibilitychange", visibilityChanged);
    };
  }, [artistId, router, isEditing]);
  return null;
}
