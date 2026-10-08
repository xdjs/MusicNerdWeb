"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { OnboardingSteps } from "@/lib/onboarding/onboardingStateTypes";

/** How long a section keeps its "new" marks once it has been on screen. */
export const FRESH_MS = 5_000;

export type SectionStep = "profiles" | "vault" | "publish";
export type FreshSections = Record<SectionStep, boolean>;

const SECTIONS: SectionStep[] = ["profiles", "vault", "publish"];

/**
 * Which research sections just arrived (docs/research-view.md, "Arrival"): a
 * section is fresh once its step is confirmed while the page watches, and stays
 * fresh until FRESH_MS after it has been on screen (`markSeen`). Steps already
 * confirmed when watching began never count.
 */
export function useFreshSections(steps: OnboardingSteps) {
    const [fresh, setFresh] = useState<FreshSections>({ profiles: false, vault: false, publish: false });
    const confirmedAtStart = useRef(new Set(SECTIONS.filter(step => steps[step] !== null)));
    const timers = useRef(new Map<SectionStep, ReturnType<typeof setTimeout>>());

    useEffect(() => {
        const arrived = SECTIONS.filter(step => steps[step] !== null && !confirmedAtStart.current.has(step));
        if (!arrived.length) return;
        arrived.forEach(step => confirmedAtStart.current.add(step));
        setFresh(current => ({ ...current, ...Object.fromEntries(arrived.map(step => [step, true])) }));
    }, [steps]);

    useEffect(() => {
        const pending = timers.current;
        return () => pending.forEach(timer => clearTimeout(timer));
    }, []);

    const markSeen = useCallback((step: SectionStep) => {
        setFresh(current => {
            if (!current[step] || timers.current.has(step)) return current;
            timers.current.set(step, setTimeout(() => setFresh(now => ({ ...now, [step]: false })), FRESH_MS));
            return current;
        });
    }, []);

    return { fresh, markSeen };
}
