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
            className="bottom-0 top-auto max-h-[85dvh] max-w-[800px] translate-y-0 overflow-y-auto rounded-t-3xl bg-white px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 dark:bg-[#1a1a1a] sm:bottom-5 sm:w-[calc(100%-2rem)] sm:rounded-3xl data-[state=closed]:hidden motion-reduce:animate-none">
            <DialogTitle className="pr-8 text-xl">Ask about {artistName}</DialogTitle>
            <DialogDescription>Explore their music, story and influences through the sources on this profile.</DialogDescription>
            <AskAboutArtist artistId={artistId} artistName={artistName} />
        </DialogContent>
    </Dialog>;
}
