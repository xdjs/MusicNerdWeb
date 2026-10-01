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
    if (item.kind === 'instagram') return <div className={`pointer-events-none relative overflow-hidden bg-black ${src ? '' : 'min-h-48'}`}>
        {src && <Image src={src} alt={alt} width={640} height={640} unoptimized
            sizes={detail ? '(max-width: 640px) 90vw, 512px' : '(max-width: 640px) 72vw, 280px'}
            className={`block h-auto w-full object-contain ${detail ? 'max-h-[60dvh]' : 'max-h-[360px]'}`}
            style={detail ? undefined : { maskImage: 'linear-gradient(to bottom, black calc(100% - 8px), transparent)' }}
            onError={() => setFailed(previous => [...previous, src])} />}
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
