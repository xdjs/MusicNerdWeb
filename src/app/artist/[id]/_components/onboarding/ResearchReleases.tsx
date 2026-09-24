"use client";

import { use } from "react";
import type { LatestRelease } from "@/server/utils/musicPlatform/latestReleases";

/** "your music on deezer": the covers of the artist's latest releases, from the
 *  same cached call the Latest section makes. Nothing when there's no artwork. */
export default function ResearchReleases({ releases }: { releases: Promise<LatestRelease[]> }) {
    const covers = use(releases).filter(r => r.imageUrl);
    if (covers.length === 0) return null;
    return (
        <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">your music on deezer</span>
            <div className="flex gap-2">
                {covers.map(r => (
                    // eslint-disable-next-line @next/next/no-img-element -- provider artwork, same as the Latest cards
                    <img key={r.id} src={r.imageUrl!} alt={`${r.title} (${r.releaseDate.slice(0, 4)})`} className="h-14 w-14 rounded-lg object-cover ring-1 ring-border sm:h-[72px] sm:w-[72px]" />
                ))}
            </div>
        </div>
    );
}
