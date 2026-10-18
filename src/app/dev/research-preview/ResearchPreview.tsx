"use client";

import ResearchStatusBar from '@/app/artist/[id]/_components/onboarding/ResearchStatusBar';
import SkeletonShape from '@/app/artist/[id]/_components/onboarding/SkeletonShape';
import { useTheme } from '@/app/_components/ThemeProvider';

/** Fixed sample state for reviewing #1532 without starting a research job. */
export default function ResearchPreview() {
    const { theme, setTheme } = useTheme();
    return (
        <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-10 pb-44 text-foreground">
            <header>
                <h1 className="text-2xl font-semibold">Research loading preview</h1>
                <p className="mt-2 text-sm text-muted-foreground">Sample state for color review.</p>
                <div className="mt-4 flex gap-2" aria-label="Preview theme">
                    {(['light', 'dark'] as const).map(value => (
                        <button key={value} type="button" aria-pressed={theme === value}
                            onClick={() => setTheme(value)} className="min-h-11 rounded-lg border border-input px-4 capitalize">
                            {value}
                        </button>
                    ))}
                </div>
            </header>
            <section id="mn-links" className="space-y-4">
                <h2 className="text-lg font-semibold">Links</h2>
                <p className="text-sm text-muted-foreground">Sample links found. Research has moved on to Lore.</p>
            </section>
            <section id="mn-lore" className="space-y-4">
                <h2 className="text-lg font-semibold">Lore</h2>
                <SkeletonShape kind="sources" />
            </section>
            <section id="mn-about" className="space-y-4">
                <h2 className="text-lg font-semibold">About</h2>
                <SkeletonShape kind="about" still />
            </section>
            <ResearchStatusBar steps={{ profiles: 'sample', vault: null, interview: null, publish: null }}
                currentStep="vault" complete={false} failure={null} onRetry={() => undefined} />
        </div>
    );
}
