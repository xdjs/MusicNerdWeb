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
    const releasePicker = detail && item.kind === 'release';
    return <div
        className={`pointer-events-none w-full bg-[#000] ${releasePicker ? 'absolute inset-0' : detail ? 'relative max-h-[60dvh] overflow-hidden' : 'relative h-[220px] shrink-0'}`}
        style={detail && !releasePicker ? { aspectRatio } : undefined}>
        {src && <>
            <Image src={src} alt={alt} fill unoptimized
                sizes={detail ? '(max-width: 640px) 90vw, 512px' : '(max-width: 640px) 72vw, 280px'}
                className={`object-contain ${detail ? '' : 'object-bottom'}`}
                onError={() => setFailed(previous => [...previous, src])} />
            {!detail && <div aria-hidden="true" className="absolute inset-x-0 top-full h-[100px] overflow-hidden"
                style={{ maskImage: 'linear-gradient(to bottom, #000, rgba(0,0,0,.3) 28px, transparent 100px)' }}>
                {/* Clip the bottom pixel row before stretching it, so only its colors continue below the artwork. */}
                <div className="relative h-px origin-top scale-y-[100] overflow-hidden">
                    <div className="absolute inset-x-0 bottom-0 h-[220px] w-full">
                        <Image src={src} alt="" fill unoptimized sizes="(max-width: 640px) 72vw, 280px" className="object-contain object-bottom" />
                    </div>
                </div>
            </div>}
        </>}
    </div>;
}
