"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import AskAboutArtist from "./AskAboutArtist";

export default function ArtistAskSheet({ artistId, artistName }: { artistId: string; artistName: string }) {
    const [open, setOpen] = useState(false);
    return <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
            <button id="mn-ask" type="button" aria-label={`Ask about ${artistName}`}
                className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 inline-flex min-h-[52px] items-center gap-2 rounded-full border border-white/20 bg-pastypink px-5 font-semibold text-gray-950 shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pastypink sm:right-8">
                <MessageCircle size={20} aria-hidden="true" /><span>Ask</span>
            </button>
        </DialogTrigger>
        <DialogContent
            className="bottom-0 top-auto max-h-[85dvh] max-w-[800px] translate-y-0 overflow-y-auto rounded-t-3xl bg-white px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 dark:bg-[#1a1a1a] sm:bottom-5 sm:w-[calc(100%-2rem)] sm:rounded-3xl data-[state=closed]:hidden motion-reduce:animate-none">
            <DialogTitle className="pr-8 text-xl">Ask about {artistName}</DialogTitle>
            <DialogDescription>Explore their music, story and influences through the sources on this profile.</DialogDescription>
            <AskAboutArtist artistId={artistId} artistName={artistName} />
        </DialogContent>
    </Dialog>;
}
