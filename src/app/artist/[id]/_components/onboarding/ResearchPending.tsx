"use client";

import { useContext, useEffect, useRef, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { OnboardingProgressContext } from "./OnboardingProgressContext";
import type { SectionStep } from "./useFreshSections";

type Skeleton = "links" | "sources" | "about";

function SkeletonShape({ kind }: { kind: Skeleton }) {
    if (kind === "about") {
        return (
            <div className="flex max-w-xl flex-col gap-2.5">
                {["w-[96%]", "w-[88%]", "w-[62%]"].map(width => (
                    <Skeleton key={width} data-skeleton="line" className={`h-3 bg-current opacity-25 dark:bg-current ${width}`} />
                ))}
            </div>
        );
    }
    if (kind === "sources") {
        return (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[0, 1, 2].map(i => (
                    <div key={i} data-skeleton="card" className={`overflow-hidden rounded-xl border border-black/10 dark:border-white/10 ${i > 1 ? "hidden sm:block" : ""}`}>
                        <Skeleton className="h-28 rounded-none" />
                        <div className="flex flex-col gap-2 p-3">
                            <Skeleton className="h-2.5 w-[85%] rounded" />
                            <Skeleton className="h-2.5 w-[55%] rounded" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }
    return (
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-7">
            {[0, 1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} data-skeleton="tile" className={`flex flex-col items-center gap-2 ${i > 3 ? "hidden sm:flex" : ""} ${i > 5 ? "sm:hidden md:flex" : ""}`}>
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <Skeleton className="h-2 w-12 rounded" />
                </div>
            ))}
        </div>
    );
}

/**
 * A profile section research fills (docs/research-view.md, "Sections"). While
 * its step isn't confirmed: a skeleton in the section's shape and a caption
 * (above the section, or for the About instead of it). When it has just
 * arrived: the section fades in, is marked, announces itself once and reports
 * when it has been on screen. Otherwise, or with no build being watched, just
 * the section.
 */
export default function ResearchPending({ step, skeleton, label, arrivedLabel, children }: {
    step: SectionStep;
    skeleton: Skeleton;
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
        return (
            <>
                <div role="status" aria-label={label} className="flex flex-col gap-3">
                    <SkeletonShape kind={skeleton} />
                    <span className={`text-sm ${skeleton === "about" ? "opacity-80" : "text-[hsl(var(--muted-foreground))]"}`}>{label}</span>
                </div>
                {skeleton !== "about" && children}
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
