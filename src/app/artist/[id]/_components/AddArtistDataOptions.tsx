"use client"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UrlMap } from "@/server/db/DbTypes";
import { TIPS_BUTTON_LABEL } from "@/lib/linkSubmissionMessages";

/**
 * Wallet/ENS examples in the urlmap aren't actually link-paste targets — exclude them from the picker.
 * Anchored on word boundaries + a 6-char minimum so a hypothetical platform whose example
 * coincidentally contains "0x" (e.g. "0xtracks.com/...") isn't false-positive-filtered.
 */
export function isWalletExample(example: string | null | undefined): boolean {
    if (!example) return false;
    return /\b0x[0-9a-f]{6,}\b/i.test(example);
}

export default function AddArtistDataOptions({ availableLinks, setOption }: { availableLinks: UrlMap[], setOption: (option: string) => void }) {
    const sortedLinks = [...availableLinks]
        .filter(link => !isWalletExample(link.example))
        .sort((a, b) => (a.example || "").localeCompare(b.example || ""));
    const dataOptions = sortedLinks.map(link => (
        <DropdownMenuItem
            key={link.id}
            className="min-h-11 cursor-pointer rounded-lg px-3 text-xs text-white/80 focus:bg-white/10 focus:text-white"
            onClick={() => setOption(link.example.replace(/^(?:https?:\/\/)?(?:www\.)?/, ''))}
        >
            {link.example.replace(/^(?:https?:\/\/)?(?:www\.)?/, '')}
        </DropdownMenuItem>
    ));
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-11 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs text-white/75 hover:bg-white/10 hover:text-white whitespace-nowrap focus-visible:ring-pastypink"
                >
                    {TIPS_BUTTON_LABEL}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                side="top"
                align="end"
                sideOffset={6}
                className="scrollbar-glass max-h-[40dvh] max-w-[calc(100vw-3rem)] overflow-auto rounded-xl border border-white/15 bg-neutral-950/95 p-1 text-white shadow-xl backdrop-blur-xl"
            >
                {dataOptions}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
