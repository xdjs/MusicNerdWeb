"use client";

import { useState } from "react";
import { Portal } from "@radix-ui/react-tooltip";
import { ShieldCheck } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function ClaimedBadge() {
    const [open, setOpen] = useState(false);

    return (
        <TooltipProvider delayDuration={150}>
            <Tooltip open={open} onOpenChange={setOpen}>
                <TooltipTrigger asChild>
                    <button
                        type="button"
                        aria-label="Claimed artist profile"
                        onClick={event => {
                            // Keep the explanation open after a tap; Radix otherwise closes on click.
                            event.preventDefault();
                            setOpen(true);
                        }}
                        className="inline-flex min-h-11 shrink-0 cursor-help items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlightpink focus-visible:ring-offset-2 focus-visible:ring-offset-[#211e23]"
                    >
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-highlightpink/50 bg-[#241620] px-3 py-1.5 text-xs font-semibold text-highlightpink">
                            <ShieldCheck size={16} aria-hidden="true" />
                            Claimed
                        </span>
                    </button>
                </TooltipTrigger>
                <Portal>
                    <TooltipContent
                        side="top"
                        sideOffset={6}
                        collisionPadding={16}
                        className="max-w-[240px] animate-none rounded-lg border-white/15 bg-[#211e23] px-3 py-2 text-center text-xs leading-relaxed text-white shadow-lg data-[state=closed]:animate-none"
                    >
                        This profile has been claimed by the artist.
                    </TooltipContent>
                </Portal>
            </Tooltip>
        </TooltipProvider>
    );
}
