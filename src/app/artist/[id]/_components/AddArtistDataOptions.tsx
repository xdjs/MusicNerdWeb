"use client"
import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button"
import { UrlMap } from "@/server/db/DbTypes";
import { TIPS_BUTTON_LABEL } from "@/lib/linkSubmissionMessages";

/** Wallet and ENS rows aren't link-paste targets; everything else in the urlmap is.
 *  Filter by site name, the way AddArtistData already does for display. Matching
 *  the example text instead hid In Process, whose example URL carries a 0x address. */
const NOT_LINK_TARGETS = new Set(['wallets', 'ens']);
export function isLinkTarget(link: Pick<UrlMap, 'siteName'>): boolean {
    return !NOT_LINK_TARGETS.has(link.siteName);
}

export default function AddArtistDataOptions({ availableLinks, setOption }: { availableLinks: UrlMap[], setOption: (option: string) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const examplesId = useId();
    const sortedLinks = [...availableLinks]
        .filter(isLinkTarget)
        .sort((a, b) => (a.example || "").localeCompare(b.example || ""));

    return (
        <div>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-expanded={isOpen}
                aria-controls={examplesId}
                onClick={() => setIsOpen(open => !open)}
                className="h-11 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs text-white/75 hover:bg-white/10 hover:text-white focus-visible:ring-pastypink"
            >
                {TIPS_BUTTON_LABEL}
                <ChevronDown aria-hidden="true" className={`ml-2 h-4 w-4 ${isOpen ? "rotate-180" : ""}`} />
            </Button>
            {isOpen && (
                <div id={examplesId} className="mt-2 rounded-xl border border-white/15 bg-white/[0.03] p-2">
                    <p className="px-2 py-1 text-xs leading-relaxed text-white/50">Choose an example, then replace it with the artist’s profile URL.</p>
                    <ul className="scrollbar-glass max-h-[min(28dvh,14rem)] overflow-y-auto overscroll-contain">
                        {sortedLinks.map(link => {
                            // Older urlmap rows use ARTIST_NAME, but Spotify artist URLs require an ID.
                            const example = link.siteName === 'spotify'
                                ? 'open.spotify.com/artist/ARTIST_ID'
                                : link.example.replace(/^(?:https?:\/\/)?(?:www\.)?/, '');
                            return (
                                <li key={link.id}>
                                    <button
                                        type="button"
                                        className="min-h-11 w-full rounded-lg px-2 py-2 text-left text-sm text-white/80 [overflow-wrap:anywhere] hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pastypink"
                                        onClick={() => { setIsOpen(false); setOption(example); }}
                                    >
                                        {example}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
}
