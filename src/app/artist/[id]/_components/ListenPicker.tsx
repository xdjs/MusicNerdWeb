"use client";

import Image from 'next/image';
import { ArrowUpRight, Music2, Play } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { ProfileLink } from '@/lib/artistProfileLinks';

function ServiceLogo({ link }: { link: ProfileLink }) {
    const [failed, setFailed] = useState(false);
    return <span className="flex h-10 w-10 shrink-0 items-center justify-center">
        {link.iconSrc && !failed ? <Image src={link.iconSrc} alt="" width={32} height={32} unoptimized className="h-8 w-8 object-contain" onError={() => setFailed(true)} /> : <Music2 className="h-7 w-7 text-white/70" aria-hidden="true" />}
    </span>;
}

export default function ListenPicker({ artistName, links }: { artistName: string; links: ProfileLink[] }) {
    if (!links.length) return null;
    return <Dialog>
        <DialogTrigger asChild>
            <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-pastypink px-5 text-sm font-semibold text-gray-950 hover:bg-pink-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pastypink">
                Listen <Play size={14} fill="currentColor" aria-hidden="true" />
            </button>
        </DialogTrigger>
        <DialogContent className="max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-2xl border-white/10 bg-neutral-950/90 p-5 text-white shadow-2xl backdrop-blur-2xl dark:bg-neutral-950/90 sm:rounded-2xl sm:p-6">
            <DialogHeader className="pr-5 text-left">
                <DialogTitle className="text-xl font-semibold tracking-tight">Listen to {artistName}</DialogTitle>
                <DialogDescription className="text-white/55">Choose where you listen.</DialogDescription>
            </DialogHeader>
            <div className="divide-y divide-white/10">
                {links.map(link => <a key={link.siteName} href={link.href} target="_blank" rel="noopener noreferrer"
                    className="group flex min-h-14 items-center gap-3 rounded-lg px-2 py-2 text-white transition-colors hover:bg-pastypink/10 focus-visible:bg-pastypink/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pastypink">
                    <ServiceLogo link={link} />
                    <span className="min-w-0 flex-1 text-sm font-medium">{link.label}</span>
                    <ArrowUpRight size={18} className="shrink-0 text-white/35 group-hover:text-pastypink" aria-hidden="true" />
                    <span className="sr-only"> (opens in a new tab)</span>
                </a>)}
            </div>
        </DialogContent>
    </Dialog>;
}
