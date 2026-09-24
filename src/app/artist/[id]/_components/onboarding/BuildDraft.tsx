"use client";

import { useEffect, useRef } from "react";

/**
 * One block of the draft the auto-build is writing: the Lore document or the
 * About, as the model produces it (docs/llm.md, "Streaming into the build
 * popup"). The raw draft, citation markers included; the page shows the
 * validated version once it is saved.
 *
 * The block is short and scrolls, and follows the text to its newest line the
 * way a terminal does, so the card never grows past the screen and the line
 * being written is the one in view.
 */
export default function BuildDraft({ label, text }: { label: string; text: string }) {
    const scroller = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = scroller.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [text]);

    return (
        <section aria-label={label} className="rounded-lg border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.04] px-3 py-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
            <div
                ref={scroller}
                className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-gray-700 dark:text-gray-300"
            >
                {text}
            </div>
        </section>
    );
}
