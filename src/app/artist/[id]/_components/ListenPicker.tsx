"use client";

import Image from 'next/image';
import { ArrowUpRight, Music2, Play } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { ProfileLink } from '@/lib/artistProfileLinks';

function ServiceLogo({ link }: { link: ProfileLink }) {
    const [failed, setFailed] = useState(false);
    return <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white p-2 shadow-sm">
        {link.iconSrc && !failed ? <Image src={link.iconSrc} alt="" width={32} height={32} unoptimized className="h-8 w-8 object-contain" onError={() => setFailed(true)} /> : <Music2 className="h-7 w-7 text-gray-800" aria-hidden="true" />}
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
        <DialogContent className="max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-2xl border-black/10 bg-white p-5 dark:border-white/10 dark:bg-[#1a1a1a] sm:rounded-2xl sm:p-6">
            <DialogHeader className="pr-5 text-left">
                <DialogTitle className="text-2xl font-bold tracking-tight">Listen to {artistName}</DialogTitle>
                <DialogDescription>Choose where you listen.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
                {links.map(link => <a key={link.siteName} href={link.href} target="_blank" rel="noopener noreferrer"
                    className="group flex min-h-16 items-center gap-3 rounded-xl bg-gray-50 px-3 py-2 text-gray-950 transition-colors hover:bg-pastypink/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pastypink dark:bg-white/5 dark:text-white dark:hover:bg-pastypink/15">
                    <ServiceLogo link={link} />
                    <span className="min-w-0 flex-1 font-semibold">{link.label}</span>
                    <ArrowUpRight size={18} className="shrink-0 text-gray-500 group-hover:text-gray-950 dark:group-hover:text-white" aria-hidden="true" />
                    <span className="sr-only"> (opens in a new tab)</span>
                </a>)}
            </div>
        </DialogContent>
    </Dialog>;
}
