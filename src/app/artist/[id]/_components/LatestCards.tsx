'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ChevronLeft, ChevronRight, Disc3, Instagram, MessageCircle } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import ArtistUpdateFilter from '@/components/ArtistUpdateFilter';
import InstagramMentionText from '@/components/InstagramMentionText';
import { matchesProfileUpdateFilter } from '@/lib/profile/matchesProfileUpdateFilter';
import { PROFILE_UPDATE_FILTERS } from '@/lib/profile/profileUpdateFilters';
import { latestDateLabel, type ArtistLatestItem } from '@/lib/artist/artistLatest';
import { MOMENT_KIND_LABELS } from '@/lib/inprocess/inprocessTimeline';

import type { ProfileLink } from '@/lib/artist/artistProfileLinks';
import { releaseListeningLinks } from '@/lib/artist/releaseListeningLinks';
import { trackEvent } from '@/lib/analytics/trackEvent';
import LatestDetailDialogContent from './LatestDetailDialogContent';
import ListeningDialogContent from './ListeningDialogContent';
import InProcessIcon from './InProcessIcon';
import LatestCardFrame from './LatestCardFrame';
import LatestCardImage from './LatestCardImage';

const categories = { release: 'Releases', instagram: 'Instagram', interview: 'In their words', moment: 'In-Process' };
const icons = { release: Disc3, instagram: Instagram, interview: MessageCircle, moment: InProcessIcon };

export default function LatestCards({ items, artistName, artistImage, unavailable, artistListeningLinks = [], sectionId = 'mn-latest', heading = 'Latest', showFilters = true, hideHeading = false, itemArtistNames = {}, itemArtistUrls = {}, refreshControl }: {
    refreshControl?: ReactNode; items: ArtistLatestItem[]; artistName: string; artistImage: string; unavailable: boolean; artistListeningLinks?: ProfileLink[]; sectionId?: string; heading?: string; showFilters?: boolean; hideHeading?: boolean; itemArtistNames?: Record<string, string>; itemArtistUrls?: Record<string, string>;
}) {
    const [choice, setChoice] = useState({artistName, value: 'All'});
    const filter = choice.artistName === artistName ? choice.value : 'All';
    const [selected, setSelected] = useState<ArtistLatestItem | null>(null);
    const selectedArtistName = selected ? itemArtistNames[selected.id] || artistName : artistName;
    const artistAction = selected && itemArtistNames[selected.id] ? (itemArtistUrls[selected.id]
        ? <Link href={itemArtistUrls[selected.id]} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-pastypink/10">View {selectedArtistName}’s profile<ArrowUpRight size={14} aria-hidden="true" /></Link>
        : <p className="text-xs text-muted-foreground">Fictional artist preview · No artist profile or original source is available.</p>) : undefined;
    const releaseLinks = selected ? releaseListeningLinks(selected, artistName, [], artistListeningLinks) : [];
    const galleryRef = useRef<HTMLDivElement>(null);
    const openerRef = useRef<HTMLButtonElement | null>(null);
    const [canScroll, setCanScroll] = useState({ previous: false, next: false });
    const visible = items.filter(item => matchesProfileUpdateFilter(item.kind, filter));
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
    return <section id={sectionId} aria-labelledby={`${sectionId}-heading`} className="glass space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h2 id={`${sectionId}-heading`} className={hideHeading ? "sr-only" : "text-xl font-bold text-black dark:text-white"}>{heading}</h2>
        {refreshControl}
        </div>
        {showFilters && items.length > 0 && <ArtistUpdateFilter value={filter} onValueChange={value => setChoice({artistName, value})} />}
        {items.length > 0 && visible.length === 0 && <p role="status" className="p-6 text-sm text-muted-foreground">No {PROFILE_UPDATE_FILTERS.find(section => section.id === filter)?.label} updates yet.</p>}
        {items.length === 0 ? <p className="glass rounded-2xl p-6 text-sm text-gray-600 dark:text-gray-300">
            {unavailable ? 'Latest updates couldn’t load right now. Please try again later.' : `When ${artistName} shares new music, Instagram posts or interview answers, they’ll appear here.`}
        </p> : <>
            {unavailable && <p role="status" className="text-xs text-gray-600 dark:text-gray-400">Some updates couldn’t load. Showing what’s available.</p>}
            <div className="group/gallery relative">
            <button type="button" aria-label="Previous updates" aria-controls={`${sectionId}-gallery`} disabled={!canScroll.previous} onClick={() => scrollGallery(-1)}
                className="absolute -left-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white shadow-lg backdrop-blur-md transition-opacity hover:bg-black/80 disabled:pointer-events-none disabled:opacity-0 sm:flex sm:opacity-0 sm:group-hover/gallery:opacity-100 sm:group-focus-within/gallery:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pastypink"><ChevronLeft size={18} aria-hidden="true" /></button>
            <div ref={galleryRef} id={`${sectionId}-gallery`} role="region" aria-label="Latest updates gallery" tabIndex={0}
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
                        {itemArtistNames[item.id] && <div className="mb-3 min-h-6 text-sm font-semibold text-foreground">{itemArtistUrls[item.id] ? <Link href={itemArtistUrls[item.id]} className="inline-flex items-center gap-1.5 hover:underline">{itemArtistNames[item.id]}<ArrowUpRight size={13} aria-hidden="true" /></Link> : <span>{itemArtistNames[item.id]} <span className="font-normal text-muted-foreground">· Sample</span></span>}</div>}
                        <LatestCardFrame onOpen={event => { openerRef.current = event.currentTarget; setSelected(item); trackEvent('latest_card_open', { kind: item.kind, filter: filter.toLowerCase() }); }} label={`Read ${item.title}`} instagram={item.kind === 'instagram'}>
                            <LatestCardImage key={`${item.id}:${item.imageUrl}`} item={item} artistImage={artistImage} artistName={artistName} />
                            {item.kind !== 'instagram' && <div className="pointer-events-none absolute left-4 right-4 top-4 flex items-center justify-between gap-2">
                                {/* Chips never break inside; when both cannot fit beside the arrow (phone width,
                                    a long media type), the media-type chip drops to a second row instead. */}
                                <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                                    <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/20 bg-black/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-md"><Icon size={12} aria-hidden="true" />{categories[item.kind]}</span>
                                    {item.momentKind && <span className="shrink-0 whitespace-nowrap rounded-full border border-white/20 bg-black/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-purple-200 backdrop-blur-md">{MOMENT_KIND_LABELS[item.momentKind]}</span>}
                                </span>
                                <ArrowUpRight size={18} aria-hidden="true" />
                            </div>}
                            <div className={`pointer-events-none relative space-y-2 ${item.kind === 'instagram' ? 'p-5 pt-6' : ''}`}>
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    {item.kind === 'instagram' && <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/75"><Icon size={12} aria-hidden="true" />{categories[item.kind]}</span>}
                                    <time dateTime={item.date} className="text-[11px] font-medium text-white/75">{latestDateLabel(item.date)}</time>
                                </div>
                                <h3 className={`font-semibold leading-snug ${item.kind === 'instagram' ? 'sr-only' : 'line-clamp-2 text-lg'}`}>{item.title}</h3>
                                <p className={`whitespace-pre-line ${item.kind === 'release' || item.kind === 'moment' ? 'text-sm text-white/80 line-clamp-2' : 'text-base leading-relaxed line-clamp-4'}`}>{item.kind === 'interview' ? `“${item.text}”` : item.kind === 'instagram' ? <InstagramMentionText text={item.text} preview /> : item.text}</p>
                                <span className={`inline-flex items-center gap-1.5 pt-1 text-[11px] font-semibold ${item.kind === 'instagram' ? 'text-highlightpink' : 'text-pink-200'}`}>
                                    {item.kind === 'release' && item.sourceUrl?.startsWith('https://open.spotify.com/') && <Image src="/siteIcons/Spotify_Primary_Logo_RGB_White.png" alt="" width={18} height={18} />}
                                    {item.kind === 'interview' ? 'Read their answer' : item.kind === 'release' ? 'Choose where to listen' : item.kind === 'moment' ? 'Open on In-Process' : 'Read the post'}<ArrowUpRight size={12} aria-hidden="true" />
                                </span>
                            </div>
                        </LatestCardFrame>
                    </article>;
                })}
            </div>
            <button type="button" aria-label="Next updates" aria-controls={`${sectionId}-gallery`} disabled={!canScroll.next} onClick={() => scrollGallery(1)}
                className="absolute -right-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white shadow-lg backdrop-blur-md transition-opacity hover:bg-black/80 disabled:pointer-events-none disabled:opacity-0 sm:flex sm:opacity-0 sm:group-hover/gallery:opacity-100 sm:group-focus-within/gallery:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pastypink"><ChevronRight size={18} aria-hidden="true" /></button>
            </div>
        </>}
        <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null); }}>
            {selected?.kind === 'release' && <ListeningDialogContent
                title={`Listen to ${selected.title}`} description={itemArtistNames[selected.id] || artistName} links={releaseLinks} release surface="latest" footer={artistAction}
                artwork={<div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg">
                    <LatestCardImage key={`listen:${selected.id}`} item={selected} artistImage={artistImage} artistName={artistName} detail />
                </div>} />}
            {selected && selected.kind !== 'release' && <LatestDetailDialogContent
                onCloseAutoFocus={event => { event.preventDefault(); openerRef.current?.focus(); }}
                artwork={<LatestCardImage key={`detail:${selected.id}`} item={selected} artistImage={artistImage} artistName={artistName} detail />}
                fullImage={selected.kind === 'instagram'}
                category={categories[selected.kind]} title={selected.title}
                description={`${itemArtistNames[selected.id] || artistName} · ${latestDateLabel(selected.date)}`}
                text={selected.kind === 'interview' ? `“${selected.text}”` : selected.kind === 'instagram' ? <InstagramMentionText text={selected.text} /> : selected.text}
                sourceUrl={selected.sourceUrl} sourceLabel={selected.sourceLabel} footer={artistAction}
            />}
        </Dialog>
    </section>;
}
