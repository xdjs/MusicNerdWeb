"use client";

import { useState } from "react";
import type { SourceView } from "@/lib/onboarding/buildStages";
import { sourceDomain } from "@/lib/onboarding/sourceDomain";

/** A saved source with a share image: the image, then the domain above the
 *  title. Opens the source. An image that fails to load is dropped, not
 *  replaced by a broken frame. */
export default function ResearchSourceCard({ source }: { source: SourceView }) {
    const [imageFailed, setImageFailed] = useState(false);
    const domain = sourceDomain(source.url);
    return (
        <li className="min-w-0">
            <a href={source.url} target="_blank" rel="noopener noreferrer" className="flex h-full flex-col overflow-hidden rounded-xl shadow-[0_0_0_1px_hsl(var(--border))] transition-colors hover:bg-muted/40">
                {source.ogImage && !imageFailed && (
                    // eslint-disable-next-line @next/next/no-img-element -- a third-party share image, any host
                    <img src={source.ogImage} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setImageFailed(true)} className="aspect-[16/10] w-full object-cover" />
                )}
                <span className="flex flex-col gap-1 p-3">
                    <span className="truncate font-mono text-xs text-[hsl(var(--muted-foreground))]">{domain}</span>
                    <span className="line-clamp-2 text-sm font-medium leading-5 text-foreground">{source.title ?? domain}</span>
                </span>
            </a>
        </li>
    );
}
