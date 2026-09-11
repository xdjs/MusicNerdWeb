'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ArrowUpRight, ChevronLeft, ChevronRight, Disc3, Instagram, MessageCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { latestDateLabel, type ArtistLatestItem, type LatestKind } from '@/lib/artistLatest';

const categories = { release: 'Releases', instagram: 'Instagram', interview: 'In their words' };
const icons = { release: Disc3, instagram: Instagram, interview: MessageCircle };

function CardImage({ item, artistImage, artistName, detail = false }: { item: ArtistLatestItem; artistImage: string; artistName: string; detail?: boolean }) {
    const [failed, setFailed] = useState<string[]>([]);
    const candidates = [...new Set([item.imageUrl, artistImage, '/default_pfp_pink.png'].filter((url): url is string => !!url))];
    const src = candidates.find(url => !failed.includes(url));
    const release = item.kind === 'release';
    return <div className={`absolute inset-0 ${release ? 'bg-[#15121b]' : 'bg-gradient-to-br from-pastypink/30 via-violet-950 to-slate-950'}`}>
        <div className={release ? (detail ? 'absolute inset-4' : 'absolute inset-x-5 top-12 h-[140px]') : 'absolute inset-0'}>
            {src && <Image src={src} alt={src === item.imageUrl ? item.imageCaption : `${artistName} portrait`}
                fill unoptimized sizes="(max-width: 640px) 80vw, 360px" className={release ? 'object-contain' : 'object-cover object-top'}
                onError={() => setFailed(previous => [...previous, src])} />}
        </div>
        {!release && <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-black/5" />}
    </div>;
}

export default function LatestCards({ items, artistName, artistImage, unavailable }: {
    items: ArtistLatestItem[]; artistName: string; artistImage: string; unavailable: boolean;
}) {
    const [filter, setFilter] = useState<LatestKind | 'all'>('all');
    const [selected, setSelected] = useState<ArtistLatestItem | null>(null);
    const galleryRef = useRef<HTMLDivElement>(null);
    const [canScroll, setCanScroll] = useState({ previous: false, next: false });
    const visible = items.filter(item => filter === 'all' || item.kind === filter);
    const updateScrollBounds = useCallback(() => {
        const gallery = galleryRef.current;
        if (!gallery) return;
        const previous = gallery.scrollLeft > 1;
        const next = gallery.scrollLeft + gallery.clientWidth < gallery.scrollWidth - 1;
        setCanScroll(current => current.previous === previous && current.next === next ? current : { previous, next });
    }, []);
    useEffect(() => {
        const gallery = galleryRef.current;
        if (!gallery) return;
        // Each filter starts at its first update, including when the previous list was at its end.
        gallery.scrollLeft = 0;
        updateScrollBounds();
        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateScrollBounds);
        observer?.observe(gallery);
        return () => observer?.disconnect();
    }, [filter, items, updateScrollBounds]);
    function scrollGallery(direction: number) {
        const gallery = galleryRef.current;
        if (!gallery) return;
        const cardWidth = gallery.firstElementChild?.getBoundingClientRect().width ?? gallery.clientWidth;
        // Native scrolling keeps touch/trackpad behavior; CSS respects reduced-motion preferences.
        gallery.scrollBy({ left: direction * (cardWidth + 16) });
    }
    return <section id="mn-latest" aria-labelledby="latest-heading" className="glass space-y-4 p-4 sm:p-5">
        <h2 id="latest-heading" className="text-xl font-bold text-black dark:text-white">Latest</h2>
        {items.length > 0 && <div className="flex flex-wrap gap-2" aria-label="Filter latest activity">
            {(['all', ...Object.keys(categories).filter(kind => items.some(item => item.kind === kind))] as const).map(kind =>
                <button key={kind} type="button" aria-pressed={filter === kind} onClick={() => setFilter(kind as LatestKind | 'all')}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-pastypink ${filter === kind ? 'border-pastypink bg-pastypink text-gray-950' : 'border-black/10 bg-white/60 text-gray-700 hover:border-pastypink dark:border-white/15 dark:bg-white/5 dark:text-gray-300'}`}>
                    {kind === 'all' ? 'All' : categories[kind as LatestKind]}
                </button>)}
        </div>}
        {items.length === 0 ? <p className="glass rounded-2xl p-6 text-sm text-gray-600 dark:text-gray-300">
            {unavailable ? 'Latest updates couldn’t load right now. Please try again later.' : `When ${artistName} shares new music, Instagram posts or interview answers, they’ll appear here.`}
        </p> : <>
            {unavailable && <p role="status" className="text-xs text-gray-600 dark:text-gray-400">Some updates couldn’t load. Showing what’s available.</p>}
            <div className="group/gallery relative">
            <button type="button" aria-label="Previous updates" aria-controls="latest-gallery" disabled={!canScroll.previous} onClick={() => scrollGallery(-1)}
                className="absolute -left-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white shadow-lg backdrop-blur-md transition-opacity hover:bg-black/80 disabled:pointer-events-none disabled:opacity-0 sm:flex sm:opacity-0 sm:group-hover/gallery:opacity-100 sm:group-focus-within/gallery:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pastypink"><ChevronLeft size={18} aria-hidden="true" /></button>
            <div ref={galleryRef} id="latest-gallery" role="region" aria-label="Latest updates gallery" tabIndex={0}
                onScroll={updateScrollBounds}
                onKeyDown={event => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                        event.preventDefault();
                        scrollGallery(event.key === 'ArrowLeft' ? -1 : 1);
                    }
                }}
                className="scrollbar-hide flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain scroll-smooth py-2 motion-reduce:scroll-auto focus-visible:rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pastypink">
                {visible.map(item => {
                    const Icon = icons[item.kind];
                    return <article key={item.id} className="relative w-[72%] min-w-0 shrink-0 snap-start sm:w-[280px]">
                        <button type="button" onClick={() => setSelected(item)} aria-label={`Read ${item.title}`}
                            className="group relative flex h-[300px] w-full flex-col justify-end overflow-hidden rounded-2xl border border-pastypink/25 p-5 text-left text-white shadow-[0_8px_28px_rgba(236,72,153,0.10)] transition-transform motion-safe:hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pastypink">
                            <CardImage key={`${item.id}:${item.imageUrl}`} item={item} artistImage={artistImage} artistName={artistName} />
                            <div className="absolute left-4 right-4 top-4 flex items-center justify-between gap-2">
                                <span className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-md"><Icon size={12} aria-hidden="true" />{categories[item.kind]}</span>
                                <ArrowUpRight size={18} aria-hidden="true" />
                            </div>
                            <div className="relative space-y-2">
                                <time dateTime={item.date} className="text-[11px] font-medium text-white/75">{latestDateLabel(item.date)}</time>
                                <h3 className={`font-semibold leading-snug ${item.kind === 'instagram' ? 'sr-only' : 'line-clamp-2 text-lg'}`}>{item.title}</h3>
                                <p className={`whitespace-pre-line ${item.kind === 'release' ? 'text-sm text-white/80 line-clamp-2' : 'text-base leading-relaxed line-clamp-4'}`}>{item.kind === 'interview' ? `“${item.text}”` : item.text}</p>
                                <span className="inline-flex items-center gap-1.5 pt-1 text-[11px] font-semibold text-pink-200">
                                    {item.kind === 'release' && item.sourceUrl?.startsWith('https://open.spotify.com/') && <Image src="/siteIcons/Spotify_Primary_Logo_RGB_White.png" alt="" width={18} height={18} />}
                                    {item.kind === 'interview' ? 'Read their answer' : item.kind === 'release' ? item.sourceLabel.replace('Listen on', 'Release via') : 'Read the post'}<ArrowUpRight size={12} aria-hidden="true" />
                                </span>
                            </div>
                        </button>
                    </article>;
                })}
            </div>
            <button type="button" aria-label="Next updates" aria-controls="latest-gallery" disabled={!canScroll.next} onClick={() => scrollGallery(1)}
                className="absolute -right-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white shadow-lg backdrop-blur-md transition-opacity hover:bg-black/80 disabled:pointer-events-none disabled:opacity-0 sm:flex sm:opacity-0 sm:group-hover/gallery:opacity-100 sm:group-focus-within/gallery:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pastypink"><ChevronRight size={18} aria-hidden="true" /></button>
            </div>
        </>}
        <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null); }}>
            {selected && <DialogContent className="max-h-[90dvh] w-[calc(100%_-_2rem)] overflow-y-auto rounded-2xl border-white/15 bg-neutral-950/80 bg-gradient-to-br from-white/[0.08] via-transparent to-white/[0.02] p-0 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl backdrop-saturate-150 dark:bg-neutral-950/80">
                <div className="relative h-56 overflow-hidden rounded-t-2xl">
                    <CardImage key={`detail:${selected.id}`} item={selected} artistImage={artistImage} artistName={artistName} detail />
                    {selected.kind !== 'release' && <span className="absolute bottom-4 left-5 text-xs font-semibold uppercase tracking-widest text-pink-200">{categories[selected.kind]}</span>}
                </div>
                <div className="space-y-4 px-5 pb-6">
                    <DialogTitle className="pr-3 text-xl leading-snug">{selected.title}</DialogTitle>
                    <DialogDescription className="text-white/60">{artistName} · {latestDateLabel(selected.date)}</DialogDescription>
                    <p className="whitespace-pre-wrap break-words text-sm leading-7 text-white/85">{selected.kind === 'interview' ? `“${selected.text}”` : selected.text}</p>
                    {selected.sourceUrl && <a href={selected.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-pastypink/40 bg-pastypink/10 px-4 py-2 text-sm font-semibold text-pastypink hover:bg-pastypink/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pastypink">{selected.sourceLabel}<ArrowUpRight size={14} aria-hidden="true" /></a>}
                </div>
            </DialogContent>}
        </Dialog>
    </section>;
}
