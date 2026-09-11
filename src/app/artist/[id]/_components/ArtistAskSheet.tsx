"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import AskAboutArtist from "./AskAboutArtist";

export default function ArtistAskSheet({ artistId, artistName }: { artistId: string; artistName: string }) {
    const [open, setOpen] = useState(false);
    return <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
            <Button id="mn-ask" type="button" variant="pink" aria-label={`Ask about ${artistName}`}
                className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 min-h-[52px] border border-white/35 bg-pastypink/85 bg-gradient-to-br from-white/25 via-white/5 to-transparent px-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_8px_24px_rgba(0,0,0,0.2)] backdrop-blur-xl backdrop-saturate-150 hover:bg-pastypink/95 sm:right-8">
                <MessageCircle size={20} aria-hidden="true" /><span>Ask</span>
            </Button>
        </DialogTrigger>
        <DialogContent
            className="bottom-0 top-auto max-h-[85dvh] max-w-[800px] translate-y-0 overflow-y-auto artist-ask-panel rounded-t-3xl border-white/15 bg-neutral-950/80 bg-gradient-to-br from-white/[0.08] via-transparent to-white/[0.02] px-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl backdrop-saturate-150 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 dark:bg-neutral-950/80 sm:bottom-5 sm:w-[calc(100%-2rem)] sm:rounded-3xl data-[state=closed]:hidden motion-reduce:animate-none">
            <DialogTitle className="pr-8 text-xl">Ask about {artistName}</DialogTitle>
            <DialogDescription className="text-white/60">Explore their music, story and influences through the sources on this profile.</DialogDescription>
            <AskAboutArtist artistId={artistId} artistName={artistName} />
        </DialogContent>
    </Dialog>;
}
