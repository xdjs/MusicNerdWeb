"use client";

import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import ListeningLinks from './ListeningLinks';
import type { ProfileLink } from '@/lib/artistProfileLinks';

export default function ListenPicker({ artistName, links }: { artistName: string; links: ProfileLink[] }) {
    if (!links.length) return null;
    return <Dialog>
        <DialogTrigger asChild>
            <Button type="button" variant="pink" className="px-5">
                Listen <Play size={14} fill="currentColor" aria-hidden="true" />
            </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-2xl border-white/10 bg-neutral-950/90 p-5 text-white shadow-2xl backdrop-blur-2xl dark:bg-neutral-950/90 sm:rounded-2xl sm:p-6">
            <DialogHeader className="pr-5 text-left">
                <DialogTitle className="text-xl font-semibold tracking-tight">Listen to {artistName}</DialogTitle>
                <DialogDescription className="text-white/55">Choose where you listen.</DialogDescription>
            </DialogHeader>
            <ListeningLinks links={links} />
        </DialogContent>
    </Dialog>;
}
