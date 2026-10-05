"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { musicNerdApiUrl } from "@/lib/musicNerdApi/musicNerdApiUrl";
import { newlyConfirmedSteps } from "@/lib/onboarding/newlyConfirmedSteps";
import type { OnboardingStateView } from "@/lib/onboarding/onboardingStateTypes";

/** How often the page reads the build's state while it runs. */
export const POLL_MS = 2_000;
/** How long without a newly confirmed step before the strip offers "try again". */
export const STALL_MS = 90_000;

/**
 * Follows the build from MusicNerdAPI's GET /api/onboarding/{artistId}/state
 * (docs/research-view.md, "Progress"): polls every ~2 s while incomplete,
 * refreshes the page once per newly confirmed step, and on `complete`
 * refreshes once more, calls `onComplete` and stops. An unreadable poll is
 * skipped, never read as "not started".
 */
export function useOnboardingProgress(artistId: string, initial: OnboardingStateView, onComplete: () => void) {
    const router = useRouter();
    const [view, setView] = useState(initial);
    const [stalled, setStalled] = useState(false);
    const steps = useRef(initial.steps);
    const done = useRef(initial.complete);
    const pollsSinceChange = useRef(0);
    const finish = useRef(onComplete);
    const routerRef = useRef(router);

    useEffect(() => {
        finish.current = onComplete;
        routerRef.current = router;
    }, [onComplete, router]);

    useEffect(() => {
        if (done.current) return;
        let cancelled = false;
        let inFlight = false;
        pollsSinceChange.current = 0;
        const timer = setInterval(async () => {
            if (inFlight || done.current) return;
            pollsSinceChange.current += 1;
            if (pollsSinceChange.current * POLL_MS >= STALL_MS) setStalled(true);
            inFlight = true;
            let next: OnboardingStateView;
            try {
                const res = await fetch(musicNerdApiUrl(`/api/onboarding/${artistId}/state`), { cache: "no-store" });
                if (!res.ok) return;
                const body = await res.json();
                next = { complete: body.complete, currentStep: body.currentStep, steps: body.steps };
            } catch {
                return;
            } finally {
                inFlight = false;
            }
            if (cancelled || done.current) return;
            const newly = newlyConfirmedSteps(steps.current, next.steps);
            steps.current = next.steps;
            setView(next);
            if (newly.length > 0) {
                pollsSinceChange.current = 0;
                setStalled(false);
            }
            if (next.complete) {
                done.current = true;
                clearInterval(timer);
                routerRef.current.refresh();
                finish.current();
                return;
            }
            if (newly.length > 0) routerRef.current.refresh();
        }, POLL_MS);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, [artistId]);

    const resetStall = useCallback(() => {
        pollsSinceChange.current = 0;
        setStalled(false);
    }, []);

    return { ...view, stalled, resetStall };
}
