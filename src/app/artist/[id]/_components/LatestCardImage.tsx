'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { ArtistLatestItem } from '@/lib/artist/artistLatest';

export default function LatestCardImage({ item, artistImage, artistName, detail = false }: {
    item: ArtistLatestItem; artistImage: string; artistName: string; detail?: boolean;
}) {
    const [failed, setFailed] = useState<string[]>([]);
    const [loadedSize, setLoadedSize] = useState<{ src: string; width: number; height: number } | null>(null);
    const candidates = [...new Set([item.imageUrl, artistImage, '/default_pfp_pink.png'].filter((url): url is string => !!url))];
    const src = candidates.find(url => !failed.includes(url));
    const alt = src === item.imageUrl ? item.imageCaption : `${artistName} portrait`;
    const dimensions = loadedSize?.src === src ? loadedSize : item.imageDimensions;
    const aspectRatio = dimensions ? `${dimensions.width} / ${dimensions.height}` : '4 / 5';
    const release = item.kind === 'release';
    // Gallery previews keep the original compact overlay; full artwork belongs in the dialog.
    if (!detail) return <div className={`pointer-events-none absolute inset-0 ${release ? 'bg-[#15121b]' : 'bg-gradient-to-br from-pastypink/30 via-violet-950 to-slate-950'}`}>
        <div className={release ? 'absolute inset-x-5 top-12 h-[140px]' : 'absolute inset-0'}>
            {src && <Image src={src} alt={alt} fill unoptimized sizes="(max-width: 640px) 80vw, 360px"
                className={release ? 'object-contain' : 'object-cover object-top'}
                onError={() => setFailed(previous => [...previous, src])} />}
        </div>
        {!release && <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-black/5" />}
    </div>;
    return <div
        className={`pointer-events-none w-full bg-[#000] ${release ? 'absolute inset-0' : 'relative max-h-[60dvh]'}`}
        style={release ? undefined : { aspectRatio }}>
        {src && <Image src={src} alt={alt} fill unoptimized
            sizes="(max-width: 640px) 90vw, 512px" className="object-contain"
            onLoad={event => {
                const { naturalWidth: width, naturalHeight: height } = event.currentTarget;
                if (width > 0 && height > 0) setLoadedSize({ src, width, height });
            }}
            onError={() => setFailed(previous => [...previous, src])} />}
        {!release && src && <div aria-hidden="true" className="absolute inset-x-0 top-full h-40 overflow-hidden"
            style={{ maskImage: 'linear-gradient(to bottom, #000, rgba(0,0,0,.35) 40px, rgba(0,0,0,.12) 96px, transparent 160px)' }}>
            {/* Extend only the bottom pixel's colors. The original image stays intact above the copy. */}
            <div className="absolute inset-x-0 -top-2 blur-sm">
                <div className="relative h-px origin-top scale-y-[176] overflow-hidden">
                    <div className="absolute inset-x-0 bottom-0 max-h-[60dvh] w-full" style={{ aspectRatio }}>
                        <Image src={src} alt="" fill unoptimized sizes="(max-width: 640px) 90vw, 512px" className="object-contain" />
                    </div>
                </div>
            </div>
        </div>}
    </div>;
}
