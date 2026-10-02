"use client";

import { useState } from "react";
import { Portal } from "@radix-ui/react-tooltip";
import { Shield, ShieldCheck } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function ArtistClaimBadge({ isClaimed }: { isClaimed: boolean }) {
    const [open, setOpen] = useState(false);

    return (
        <TooltipProvider delayDuration={150}>
            <Tooltip open={open} onOpenChange={setOpen}>
                <TooltipTrigger asChild>
                    <button
                        type="button"
                        aria-label={isClaimed ? "Claimed artist profile" : "Unclaimed artist profile"}
                        onClick={event => {
                            // Keep the explanation open after a tap; Radix otherwise closes on click.
                            event.preventDefault();
                            setOpen(true);
                        }}
                        className="inline-flex min-h-11 min-w-11 shrink-0 cursor-help items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlightpink focus-visible:ring-offset-2 focus-visible:ring-offset-[#211e23]"
                    >
                        <span className={`inline-flex items-center justify-center gap-1.5 rounded-full border text-xs font-semibold ${isClaimed ? "h-9 w-9 border-highlightpink/60 bg-[#241620] text-highlightpink" : "border-white/40 bg-[#211e23] px-3 py-2 text-white"}`}>
                            {isClaimed ? <ShieldCheck size={20} aria-hidden="true" /> : <><Shield size={16} aria-hidden="true" />Unclaimed</>}
                        </span>
                    </button>
                </TooltipTrigger>
                <Portal>
                    <TooltipContent
                        side="bottom"
                        align="start"
                        sideOffset={6}
                        collisionPadding={16}
                        className="max-w-[240px] animate-none rounded-lg border-white/15 bg-[#211e23] px-3 py-2 text-center text-xs leading-relaxed text-white shadow-lg data-[state=closed]:animate-none"
                    >
                        {isClaimed ? "This profile has been claimed by the artist." : "This profile hasn’t been claimed yet."}
                    </TooltipContent>
                </Portal>
            </Tooltip>
        </TooltipProvider>
    );
}
