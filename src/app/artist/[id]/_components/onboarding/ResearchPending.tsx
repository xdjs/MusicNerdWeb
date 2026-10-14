"use client";

import { useContext, useEffect, useRef, type ReactNode } from "react";
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

    if (!research) return <>{children}</>;
    if (research.steps[step] === null) {
        const researching = researchingSection(research.currentStep) === step;
        return (
            <>
                {researching ? (
                    <div role="status" aria-label={label}><SkeletonShape kind={skeleton} /></div>
                ) : (
                    <div aria-hidden="true"><SkeletonShape kind={skeleton} still /></div>
                )}
                {skeleton === "links" && children}
            </>
        );
    }
    if (!fresh) return <>{children}</>;
    return (
        <div ref={box} data-research-new="" className="motion-safe:animate-research-reveal">
            <span role="status" className="sr-only">{arrivedLabel}</span>
            {skeleton === "about" ? (
                <div className="flex flex-col items-start gap-2">
                    <Badge variant="highlight">New About</Badge>
                    <div className="rounded-xl ring-2 ring-highlightpink/70 transition-shadow">{children}</div>
                </div>
            ) : children}
        </div>
    );
}
