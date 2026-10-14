"use client";

import { useContext, useEffect, useRef, type ReactNode } from "react";
import { EditModeContext } from "@/app/_components/EditModeContext";
import { Badge } from "@/components/ui/badge";
import { researchingSection } from "@/lib/onboarding/researchingSection";
import { OnboardingProgressContext } from "./OnboardingProgressContext";
import SkeletonShape, { type SkeletonKind } from "./SkeletonShape";
import type { SectionStep } from "./useFreshSections";

/**
 * A profile section research fills (docs/research-view.md, "Sections"). While
 * its step isn't confirmed: a skeleton in the section's shape (above Links,
 * instead of the About and Lore), with no caption: the progress pill
 * is the one voice. It pulses, and announces `label`, only while this section
 * is being researched; a waiting one is still and hidden from screen readers. When it has just
 * arrived: the section fades in, is marked, announces itself once and reports
 * when it has been on screen. Otherwise, or with no build being watched, just
 * the section.
 */
export default function ResearchPending({ step, skeleton, label, arrivedLabel, children }: {
    step: SectionStep;
    skeleton: SkeletonKind;
    label: string;
    arrivedLabel: string;
    children?: ReactNode;
}) {
    const { suspendedEditMode } = useContext(EditModeContext);
    const research = useContext(OnboardingProgressContext);
    const fresh = !!research?.fresh[step];
    const box = useRef<HTMLDivElement>(null);
    const markSeen = research?.markSeen;

    useEffect(() => {
        if (!fresh || !markSeen) return;
        const element = box.current;
        if (!element || typeof IntersectionObserver === "undefined") {
            markSeen(step);
            return;
        }
        const observer = new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting)) {
                markSeen(step);
                observer.disconnect();
            }
        }, { threshold: 0.25 });
        observer.observe(element);
        return () => observer.disconnect();
    }, [fresh, markSeen, step]);

    const pending = !!research && !research.complete && research.steps[step] === null;
    const hidden = pending && skeleton !== "links";
    const researching = researchingSection(research?.currentStep ?? null) === step;
    return (
        <>
            {pending && (researching ? (
                <div role="status" aria-label={label}><SkeletonShape kind={skeleton} /></div>
            ) : (
                <div aria-hidden="true"><SkeletonShape kind={skeleton} still /></div>
            ))}
            <div ref={box} hidden={hidden} inert={hidden} data-research-new={!pending && fresh ? "" : undefined}
                className={!pending && fresh ? `motion-safe:animate-research-reveal ${skeleton === "about" ? "flex flex-col items-start gap-2" : ""}` : undefined}>
                {!pending && fresh && <span role="status" className="sr-only">{arrivedLabel}</span>}
                {!pending && fresh && skeleton === "about" && <Badge variant="highlight">New About</Badge>}
                <div className={!pending && fresh && skeleton === "about" ? "rounded-xl ring-2 ring-highlightpink/70 transition-shadow" : undefined}>{(!hidden || suspendedEditMode) && children}</div>
            </div>
        </>
    );
}
