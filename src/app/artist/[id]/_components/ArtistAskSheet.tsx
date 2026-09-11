"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, Minus } from "lucide-react";
import AskAboutArtist from "./AskAboutArtist";

export default function ArtistAskSheet({ artistId, artistName }: { artistId: string; artistName: string }) {
    const [open, setOpen] = useState(false);
    const [viewport, setViewport] = useState<{ height: number; bottom: number } | null>(null);
    const keyboardOpen = useRef(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLElement>(null);

    const minimize = () => {
        setOpen(false);
        setViewport(null);
        triggerRef.current?.focus({ preventScroll: true });
    };

    useEffect(() => {
        if (!open) return;
        const target = keyboardOpen.current
            ? panelRef.current?.querySelector<HTMLInputElement>("input")
            : panelRef.current?.querySelector<HTMLButtonElement>("button");
        target?.focus({ preventScroll: true });
    }, [open]);

    useEffect(() => {
        const visual = window.visualViewport;
        if (!open || !visual) return;
        const update = () => setViewport({
            height: visual.height,
            bottom: Math.max(0, window.innerHeight - visual.height - visual.offsetTop),
        });
        update();
        visual.addEventListener("resize", update);
        visual.addEventListener("scroll", update);
        return () => {
            visual.removeEventListener("resize", update);
            visual.removeEventListener("scroll", update);
        };
    }, [open]);

    return <>
            <Button ref={triggerRef} aria-expanded={open} aria-controls="artist-ask-conversation" aria-haspopup="dialog" onClick={() => open ? minimize() : setOpen(true)} id="mn-ask" type="button" variant="pink" aria-label={`Ask about ${artistName}`}
                onPointerDown={() => { keyboardOpen.current = false; }}
                onKeyDown={() => { keyboardOpen.current = true; }}
                className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 min-h-[52px] border border-white/35 bg-pastypink/85 bg-gradient-to-br from-white/25 via-white/5 to-transparent px-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_8px_24px_rgba(0,0,0,0.2)] backdrop-blur-xl backdrop-saturate-150 hover:bg-pastypink/95 sm:right-8">
                <MessageCircle size={20} aria-hidden="true" /><span>{open ? "Minimize" : "Ask"}</span>
            </Button>
        <aside ref={panelRef} role="dialog" aria-modal="false" aria-labelledby="artist-ask-title" aria-describedby="artist-ask-description"
                data-state={open ? "open" : "closed"}
                onKeyDown={event => {
                    if (event.key !== "Escape" || (event.target as HTMLElement).closest('[data-song-menu-open="true"]')) return;
                    event.stopPropagation();
                    minimize();
                }}
                id="artist-ask-conversation"
                style={{
                    display: open ? undefined : "none",
                    ...(viewport ? {
                    bottom: viewport.bottom > 0 ? viewport.bottom + 8 : undefined,
                    maxHeight: viewport.bottom > 0 ? viewport.height - 16 : undefined,
                } : {}),
                }}
                className={`artist-ask-panel fixed bottom-[calc(max(1rem,env(safe-area-inset-bottom))+4rem)] right-3 z-40 flex w-[calc(100%-1.5rem)] max-w-[390px] max-h-[min(65dvh,560px)] origin-bottom-right flex-col overflow-hidden rounded-3xl border border-white/20 bg-neutral-950/90 bg-gradient-to-br from-white/[0.08] via-transparent to-white/[0.02] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_16px_48px_rgba(0,0,0,0.3)] backdrop-blur-2xl backdrop-saturate-150 data-[state=closed]:hidden sm:right-8 ${keyboardOpen.current ? "" : "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-bottom-2 duration-200 [animation-timing-function:cubic-bezier(0.23,1,0.32,1)] motion-reduce:animate-none"}`}>
                <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-pastypink/20 bg-pastypink/10 text-pastypink"><MessageCircle size={18} aria-hidden="true" /></span>
                    <div className="min-w-0 flex-1">
                        <h2 id="artist-ask-title" className="truncate text-sm font-semibold">Ask about {artistName}</h2>
                        <p id="artist-ask-description" className="mt-0.5 text-xs text-white/50">Music, stories &amp; influences</p>
                    </div>
                    <button type="button" onClick={minimize} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-pastypink" aria-label="Minimize chat">
                        <Minus size={20} aria-hidden="true" />
                    </button>
                </div>
                <AskAboutArtist key={artistId} artistId={artistId} artistName={artistName} />
        </aside>
    </>;
}
