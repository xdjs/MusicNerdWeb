"use client";

import { useEffect } from "react";
import { musicNerdApiUrl } from "@/lib/musicNerdApi/musicNerdApiUrl";

/**
 * Keeps the research queue moving while somebody is on the page.
 *
 * The scrape and the caption extraction are minutes of work, and no request
 * lives that long, so they run as jobs — and a job needs invocations to run in.
 * The artist reading the vault step is the opportunity: they spend minutes
 * there, and each tick is a full-budget invocation happening while someone is
 * actually waiting for the result.
 *
 * Deliberately its own hook rather than part of useOnboardingChat. It shares
 * nothing with the chat, and putting it there meant a background fetch racing
 * the chat's own — which the chat tests noticed immediately by having their
 * mocked response eaten.
 *
 * The queue runs on MusicNerdAPI since the #1365 cutover, so the tick goes
 * there; MusicNerdAPI answers any origin.
 *
 * Fire-and-forget by design: nothing on screen depends on it, a failure is not
 * the artist's problem, and the work is claimed atomically so overlapping ticks
 * cannot double-run it.
 */
const TICK_MS = 20_000;
/** Consecutive "nothing to do" replies before this stops asking. */
const IDLE_TICKS_BEFORE_STOP = 5;

export function useResearchPump(artistId: string | undefined, enabled: boolean | number = true, onProgress?: () => Promise<void>, kind?: "interview_prepare") {
    useEffect(() => {
        if (!artistId || !enabled) return;
        let stopped = false;
        let idle = 0;
        let inFlight = false;
        let continuation: ReturnType<typeof setTimeout> | undefined;

        const tick = async () => {
            if (stopped || inFlight) return;
            inFlight = true;
            try {
                const res = await fetch(musicNerdApiUrl("/api/research/advance"), {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ artistId, ...(kind ? { kinds: [kind] } : {}) }),
                });
                const data = await res.json().catch(() => ({}));
                if (!stopped && res.ok && onProgress) await onProgress();
                // Stop after a few empty ticks. A page left open for an hour
                // should not keep asking a question the answer to which has
                // been "nothing to do" since the first minute.
                // A completed checkpoint can resume immediately; readiness waits,
                // failures and empty leases retain the normal polling interval.
                if (!stopped && res.ok && kind === "interview_prepare" && data?.ran && data.done === false && data.progress === "preparing") {
                    continuation = setTimeout(() => void tick(), 100);
                }
                idle = data?.ran ? 0 : idle + 1;
                if (idle >= IDLE_TICKS_BEFORE_STOP) { stopped = true; clearInterval(id); }
            } catch { /* background work; never surfaced */ }
            finally { inFlight = false; }
        };

        const id = setInterval(() => void tick(), TICK_MS);
        void tick();
        return () => { stopped = true; clearInterval(id); clearTimeout(continuation); };
    }, [artistId, enabled, onProgress, kind]);
}
