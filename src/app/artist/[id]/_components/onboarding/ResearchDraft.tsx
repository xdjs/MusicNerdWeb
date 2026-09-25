"use client";

import { Streamdown } from "streamdown";
import { citationSuperscripts } from "@/lib/onboarding/citationSuperscripts";

/** One draft the About stage is writing (the Lore document or the About),
 *  rendered as Markdown while it streams. The raw draft, citation markers
 *  included; the page shows the validated version once it's saved
 *  (docs/research-view.md). Loaded lazily, so visitors never download it. */
export default function ResearchDraft({ label, text }: { label: string; text: string }) {
    return (
        <section aria-label={label} className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold lowercase text-foreground">{label}</h3>
            <Streamdown
                className="text-[15px] leading-7 text-foreground [&_h2]:mb-1 [&_h2]:mt-4 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:lowercase [&_ul]:list-disc [&_ul]:pl-5"
                allowedTags={{ sup: [] }}
                components={{ sup: ({ children }) => <sup className="ml-px text-[10px] text-[hsl(var(--muted-foreground))]">{children}</sup> }}
            >
                {citationSuperscripts(text)}
            </Streamdown>
        </section>
    );
}
