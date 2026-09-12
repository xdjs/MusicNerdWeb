"use client";

import Image from 'next/image';
import { ArrowUpRight, Music2 } from 'lucide-react';
import { useState } from 'react';
import type { ProfileLink } from '@/lib/artistProfileLinks';

function ServiceLogo({ link }: { link: ProfileLink }) {
    const [failed, setFailed] = useState(false);
    return <span className="flex h-10 w-10 shrink-0 items-center justify-center">
        {link.iconSrc && !failed ? <Image src={link.iconSrc} alt="" width={32} height={32} unoptimized className="h-8 w-8 object-contain" onError={() => setFailed(true)} /> : <Music2 className="h-7 w-7 text-white/70" aria-hidden="true" />}
    </span>;
}

export default function ListeningLinks({ links, release = false }: { links: ProfileLink[]; release?: boolean }) {
    return <div className="divide-y divide-white/10">
                {links.map(link => <a key={link.siteName} href={link.href} target="_blank" rel="noopener noreferrer"
                    aria-label={release ? `Listen on ${link.label}` : undefined}
                    className="group flex min-h-14 items-center gap-3 rounded-lg px-2 py-2 text-white transition-colors hover:bg-pastypink/10 focus-visible:bg-pastypink/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pastypink">
                    <ServiceLogo link={link} />
                    <span className="min-w-0 flex-1 text-sm font-medium">{link.label}</span>
                    <ArrowUpRight size={18} className="shrink-0 text-white/35 group-hover:text-pastypink" aria-hidden="true" />
                    <span className="sr-only"> (opens in a new tab)</span>
                </a>)}
            </div>;
}
