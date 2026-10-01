'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { ArtistLatestItem } from '@/lib/artist/artistLatest';

export default function LatestCardImage({ item, artistImage, artistName, detail = false }: {
    item: ArtistLatestItem; artistImage: string; artistName: string; detail?: boolean;
}) {
    const [failed, setFailed] = useState<string[]>([]);
    const candidates = [...new Set([item.imageUrl, artistImage, '/default_pfp_pink.png'].filter((url): url is string => !!url))];
    const src = candidates.find(url => !failed.includes(url));
    const alt = src === item.imageUrl ? item.imageCaption : `${artistName} portrait`;
    const aspectRatio = item.imageDimensions ? `${item.imageDimensions.width} / ${item.imageDimensions.height}` : '4 / 5';
    if (item.kind === 'instagram') return <div
        className={`pointer-events-none relative w-full bg-[#000] ${detail ? 'max-h-[60dvh] overflow-hidden' : 'max-h-[360px]'}`}
        style={{ aspectRatio }}>
        {src && <>
            <Image src={src} alt={alt} fill unoptimized
                sizes={detail ? '(max-width: 640px) 90vw, 512px' : '(max-width: 640px) 72vw, 280px'}
                className="object-contain"
                onError={() => setFailed(previous => [...previous, src])} />
            {!detail && <div aria-hidden="true" className="absolute inset-x-0 top-full h-[100px] overflow-hidden"
                style={{ maskImage: 'linear-gradient(to bottom, #000, rgba(0,0,0,.3) 28px, transparent 100px)' }}>
                {/* Clip the bottom pixel row before stretching it, so only its colors continue below the artwork. */}
                <div className="relative h-px origin-top scale-y-[100] overflow-hidden">
                    <div className="absolute inset-x-0 bottom-0 max-h-[360px] w-full" style={{ aspectRatio }}>
                        <Image src={src} alt="" fill unoptimized sizes="(max-width: 640px) 72vw, 280px" className="object-contain" />
                    </div>
                </div>
            </div>}
        </>}
    </div>;
    const release = item.kind === 'release';
    return <div className={`pointer-events-none absolute inset-0 ${release ? 'bg-[#15121b]' : 'bg-gradient-to-br from-pastypink/30 via-violet-950 to-slate-950'}`}>
        <div className={release ? (detail ? 'absolute inset-4' : 'absolute inset-x-5 top-12 h-[140px]') : 'absolute inset-0'}>
            {src && <Image src={src} alt={alt}
                fill unoptimized sizes="(max-width: 640px) 80vw, 360px" className={release ? 'object-contain' : 'object-cover object-top'}
                onError={() => setFailed(previous => [...previous, src])} />}
        </div>
        {!release && <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-black/5" />}
    </div>;
}
