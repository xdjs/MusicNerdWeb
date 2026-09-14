'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { latestDateLabel } from '@/lib/artistLatest';
import { MOMENT_KIND_LABELS, type Moment, type MomentKind } from '@/lib/inprocessTimeline';
import TimelineArtwork from './TimelineArtwork';

const KIND_ORDER: MomentKind[] = ['video', 'audio', 'image', 'writing', 'other'];

/**
 * Direction A ("Shelf") from the design record: filter pills, a horizontal card row
 * on the Lore card shell, a type badge over the artwork, title and date. Every action
 * is a read or a link out to In Process.
 */
export default function TimelineCards({ moments, timelineUrl }: { moments: Moment[]; timelineUrl: string }) {
    const [selected, setSelected] = useState<MomentKind | 'all'>('all');
    const kinds = KIND_ORDER.filter(kind => moments.some(moment => moment.kind === kind));
    // The component can outlive one artist's moments (client navigation between
    // profiles); a kind that is no longer present falls back to All.
    const filter = selected === 'all' || kinds.includes(selected) ? selected : 'all';
    const visible = moments.filter(moment => filter === 'all' || moment.kind === filter);
    const count = (kind: MomentKind | 'all') => kind === 'all' ? moments.length : moments.filter(moment => moment.kind === kind).length;
    const galleryRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        // Each filter starts at its first moment, as the Latest gallery does.
        if (galleryRef.current) galleryRef.current.scrollLeft = 0;
    }, [filter, moments]);

    return <section id="mn-timeline" aria-labelledby="timeline-heading" className="glass space-y-3 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
                <h2 id="timeline-heading" className="text-xl font-bold text-black dark:text-white">Timeline</h2>
                <p className="text-[13px] text-gray-500 dark:text-gray-400">Latest moments</p>
            </div>
            <a href={timelineUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-black/10 px-2.5 py-1 text-xs text-gray-600 hover:border-black/25 dark:border-white/15 dark:text-gray-400 dark:hover:border-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pastypink">
                <span className="sm:hidden">Timeline</span><span className="hidden sm:inline">View timeline</span><ArrowUpRight size={11} aria-hidden="true" />
            </a>
        </div>

        {kinds.length > 1 && <div className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0" aria-label="Filter moments by type">
            {(['all', ...kinds] as const).map(kind =>
                <button key={kind} type="button" aria-pressed={filter === kind} onClick={() => setSelected(kind)}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-pastypink ${filter === kind ? 'bg-pastypink text-black' : 'glass-subtle text-muted-foreground hover:text-foreground'}`}>
                    {kind === 'all' ? 'All' : MOMENT_KIND_LABELS[kind]} ({count(kind)})
                </button>)}
        </div>}

        <div ref={galleryRef} role="region" aria-label="Moments" className="scrollbar-hide -mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 py-0.5 sm:-mx-5 sm:gap-3 sm:px-5">
            {visible.map(moment =>
                <a key={moment.id} href={moment.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${moment.title} on In Process`}
                    className="glass-subtle flex w-[220px] shrink-0 snap-start flex-col overflow-hidden transition-shadow hover:shadow-[0_0_30px_rgba(239,149,255,0.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pastypink sm:w-[236px]">
                    <TimelineArtwork moment={moment} />
                    <div className="flex flex-col gap-2.5 p-3">
                        <h3 className="line-clamp-2 text-sm font-semibold leading-[19px] text-black dark:text-white">{moment.title}</h3>
                        <time dateTime={moment.createdAt} className="text-xs text-gray-500 dark:text-gray-400">{latestDateLabel(moment.createdAt)}</time>
                    </div>
                </a>)}
        </div>
    </section>;
}
