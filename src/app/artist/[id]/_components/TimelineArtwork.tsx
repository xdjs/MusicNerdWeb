'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Play } from 'lucide-react';
import { MOMENT_KIND_LABELS, type Moment, type MomentKind } from '@/lib/inprocessTimeline';

// Badge ink per kind, on the near-black backdrop from the design record so the
// label reads on any artwork. Same hues the Lore badges use for their types.
const badgeInk: Record<MomentKind, string> = {
    video: 'text-purple-300',
    audio: 'text-cyan-300',
    image: 'text-sky-300',
    writing: 'text-orange-300',
    other: 'text-gray-300',
};

/** A Timeline card's artwork area: the image (gradient when missing or broken), the kind badge, and a play chip for video and audio. */
export default function TimelineArtwork({ moment }: { moment: Moment }) {
    const [failed, setFailed] = useState(false);
    const src = failed ? null : moment.imageUrl;
    return <div className="relative h-[138px] overflow-hidden bg-gradient-to-br from-pastypink/10 via-purple-900/20 to-transparent sm:h-[148px]">
        {src && <Image src={src} alt="" fill unoptimized sizes="(max-width: 640px) 220px, 236px" className="object-cover" onError={() => setFailed(true)} />}
        <span className={`absolute left-2.5 top-2.5 rounded border border-white/[0.22] bg-[#0c0c0c]/[0.82] px-[7px] py-[3px] text-[10px] font-semibold uppercase leading-3 tracking-[0.06em] backdrop-blur-[6px] ${badgeInk[moment.kind]}`}>
            {MOMENT_KIND_LABELS[moment.kind]}
        </span>
        {(moment.kind === 'video' || moment.kind === 'audio') && <span aria-hidden="true" className="absolute bottom-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white">
            <Play size={12} fill="currentColor" />
        </span>}
    </div>;
}
